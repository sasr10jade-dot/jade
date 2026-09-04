// 사이트 전역 공유 이퀄라이저 엔진 — 모든 <audio> 재생(TrackPlayer, GuideComparisonPlayer)이
// 이 하나의 Web Audio 그래프를 통과하도록 연결해서, "한 번 설정하면 어디서 재생하든 적용되는"
// 시스템 이퀄라이저(Equalizer APO 같은) 방식의 UX를 브라우저 안에서 구현한다.
//
// 그래프: <audio> 엘리먼트들 → MediaElementAudioSourceNode(엘리먼트당 1개, 최초 1회만 생성
// 가능하므로 WeakSet으로 중복 연결 방지) → 10밴드 BiquadFilterNode 체인 → AnalyserNode
// (스펙트럼/VU미터용) → destination(스피커).
export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  "평탄 (Flat)": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "베이스 부스트": [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  "보컬 부스트": [-2, -1, 0, 2, 4, 4, 3, 2, 0, 0],
  "트레블 부스트": [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
  "락": [4, 3, 0, -2, -1, 0, 2, 3, 4, 4],
  "팝": [-1, 1, 3, 4, 3, 0, -1, -1, 0, 1],
};

const STORAGE_KEY = "voicemap-eq-gains";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private filters: BiquadFilterNode[] = [];
  private analyser: AnalyserNode | null = null;
  private connectedElements = new WeakSet<HTMLAudioElement>();
  private gains: number[] = EQ_PRESETS["평탄 (Flat)"].slice();
  private listeners = new Set<() => void>();
  private loadedPersisted = false;

  private loadPersisted() {
    if (this.loadedPersisted || typeof localStorage === "undefined") return;
    this.loadedPersisted = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === EQ_BANDS.length) {
        this.gains = parsed;
      }
    } catch {
      // 저장된 값이 손상됐으면 기본값(Flat)으로 조용히 폴백.
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gains));
    } catch {
      // 프라이빗 브라우징 등으로 저장이 막혀도 EQ 자체는 계속 동작해야 하므로 무시.
    }
  }

  private ensureContext(): AudioContext {
    this.loadPersisted();
    if (this.ctx) return this.ctx;
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();

    const filters = EQ_BANDS.map((freq, i) => {
      const filter = ctx.createBiquadFilter();
      filter.type = i === 0 ? "lowshelf" : i === EQ_BANDS.length - 1 ? "highshelf" : "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = this.gains[i];
      return filter;
    });
    for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);

    const analyser = ctx.createAnalyser();
    // 1024 → 512개 주파수 빈. 시각화 쪽에서 로그 스케일로 묶어 쓰므로(저음에 몰리지 않게)
    // 촘촘한 원본 데이터가 있어야 고음 대역도 부드럽게 나온다.
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.7;
    filters[filters.length - 1].connect(analyser);
    analyser.connect(ctx.destination);

    this.ctx = ctx;
    this.filters = filters;
    this.analyser = analyser;
    return ctx;
  }

  // 오디오 엘리먼트 하나를 이 그래프에 연결 — createMediaElementSource는 같은 엘리먼트에
  // 두 번 호출하면 던지므로 WeakSet으로 중복 연결을 막는다. 절대 예외를 던지지 않음:
  // Web Audio 그래프 연결(이퀄라이저)은 "있으면 좋은" 부가 기능이고, 이게 실패한다고
  // 기본 재생(<audio>.play())까지 막히면 안 되므로 실패 시 콘솔에만 남기고 조용히 넘어감 —
  // 그래도 EQ 없이 소리는 정상적으로 나온다(엘리먼트가 그래프에 연결 안 됐을 뿐 스피커로
  // 직접 재생되는 기본 경로는 살아있음).
  connect(el: HTMLAudioElement) {
    if (this.connectedElements.has(el)) return;
    try {
      const ctx = this.ensureContext();
      this.connectedElements.add(el);
      const source = ctx.createMediaElementSource(el);
      source.connect(this.filters[0]);
    } catch (e) {
      console.error("[VOICEMAP] 이퀄라이저 연결 실패 — EQ 없이 기본 재생으로 계속 진행:", e);
    }
  }

  // AudioContext는 사용자 제스처 없이 자동 재생이 막혀 "suspended" 상태로 시작할 수 있음 —
  // 재생 버튼 클릭(사용자 제스처) 핸들러 안에서 await해서 호출해야 함.
  async resume() {
    try {
      await this.ctx?.resume();
    } catch (e) {
      console.error("[VOICEMAP] AudioContext resume 실패:", e);
    }
  }

  getGains(): number[] {
    this.loadPersisted();
    return this.gains.slice();
  }

  setBandGain(index: number, db: number) {
    this.gains[index] = db;
    if (this.filters[index]) this.filters[index].gain.value = db;
    this.persist();
    this.notify();
  }

  applyPreset(name: string) {
    const values = EQ_PRESETS[name];
    if (!values) return;
    values.forEach((v, i) => this.setBandGain(i, v));
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

// 모듈 하나당 인스턴스 하나 — 이 파일을 import하는 모든 클라이언트 컴포넌트가 같은
// 그래프를 공유해야 "전역 이퀄라이저"가 성립한다. 생성자 자체는 브라우저 API를 건드리지
// 않으므로(실제 AudioContext 생성은 connect() 시점) 서버 사이드에서 모듈이 평가돼도 안전.
export const audioEngine = new AudioEngine();
