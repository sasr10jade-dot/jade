"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { audioEngine } from "@/lib/audio-engine";
import { pingTrackPlay } from "@/lib/waveform";

// Howler(html5:true) + 커스텀 rAF 루프 + isPlayingRef 워크어라운드를 대체 — 네이티브
// <audio> 엘리먼트의 play/pause/timeupdate/ended 이벤트를 그대로 신뢰한다.
//
// 호출부가 실제 <audio> JSX를 렌더링(className="hidden")하고 이 훅이 내려주는 콜백 ref로
// 연결한다 — new Audio()로 만드는 분리된(DOM에 없는) 엘리먼트 대신 실제 마운트된 엘리먼트를
// 쓰는 쪽이 여러 브라우저 환경에서 더 안전하다.
//
// urls 배열이 여러 개면(가이드 A/B 비교) 전부 미리 로드해두고 switchTo()로 즉시 전환한다.
export function useNativeAudioPlayer(urls: string[], trackId?: string) {
  const audioElsRef = useRef<(HTMLAudioElement | null)[]>([]);
  const activeIndexRef = useRef(0);
  const pinged = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durations, setDurations] = useState<number[]>(() => urls.map(() => 0));
  const [error, setError] = useState<string | null>(null);

  const urlsKey = urls.join("|");

  // urls 개수가 바뀔 때만 콜백 배열을 새로 만들어 참조를 안정적으로 유지(매 렌더마다
  // 새 클로저를 만들면 React가 매번 ref를 null→새값으로 다시 호출하게 됨). 클로저 안에서
  // ref를 읽고 쓰는 건 실제 실행이 커밋 단계(React가 ref callback을 호출할 때)에 일어나서
  // 문제 없음 — 여기서 만드는 건 함수 값 자체일 뿐, 렌더 중에 .current를 읽거나 쓰지 않음.
  const audioRefCallbacks = useMemo(
    () =>
      urls.map((_, i) => (el: HTMLAudioElement | null) => {
        audioElsRef.current[i] = el;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [urls.length]
  );

  useEffect(() => {
    activeIndexRef.current = 0;

    const cleanups: Array<() => void> = [];
    urls.forEach((_, i) => {
      const el = audioElsRef.current[i];
      if (!el) return;
      const onLoaded = () => {
        setDurations((prev) => {
          const next = [...prev];
          next[i] = el.duration || 0;
          return next;
        });
      };
      const onTimeUpdate = () => {
        if (i === activeIndexRef.current) setCurrentTime(el.currentTime);
      };
      const onPlay = () => {
        if (i !== activeIndexRef.current) return;
        setIsPlaying(true);
        if (!pinged.current && trackId) {
          pinged.current = true;
          pingTrackPlay(trackId);
        }
      };
      const onPause = () => {
        if (i === activeIndexRef.current) setIsPlaying(false);
      };
      const onEnded = () => {
        if (i === activeIndexRef.current) setIsPlaying(false);
      };
      const onError = () => {
        if (i !== activeIndexRef.current) return;
        console.error("[VOICEMAP] 오디오 로드 실패:", el.error);
        setError("오디오를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      };
      el.addEventListener("loadedmetadata", onLoaded);
      el.addEventListener("timeupdate", onTimeUpdate);
      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      el.addEventListener("ended", onEnded);
      el.addEventListener("error", onError);
      cleanups.push(() => {
        el.removeEventListener("loadedmetadata", onLoaded);
        el.removeEventListener("timeupdate", onTimeUpdate);
        el.removeEventListener("play", onPlay);
        el.removeEventListener("pause", onPause);
        el.removeEventListener("ended", onEnded);
        el.removeEventListener("error", onError);
        el.pause();
      });
    });

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey, trackId]);

  async function togglePlay() {
    const el = audioElsRef.current[activeIndexRef.current];
    if (!el) {
      console.error("[VOICEMAP] togglePlay: 오디오 엘리먼트가 아직 준비되지 않았습니다");
      setError("플레이어가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setError(null);
    if (!el.paused) {
      el.pause();
      return;
    }
    // 기본 재생을 최우선으로 — 이퀄라이저(Web Audio) 연결은 재생이 이미 시작된 뒤에
    // 별도로 시도한다. 이렇게 분리해두면 Web Audio 쪽에서 어떤 문제가 생기더라도
    // (브라우저 정책, 확장 프로그램 등) 기본 <audio> 재생 자체는 절대 막히지 않는다.
    try {
      await el.play();
    } catch (e) {
      console.error("[VOICEMAP] 재생 실패:", e);
      setError(e instanceof Error ? `재생 실패: ${e.message}` : "재생에 실패했습니다");
      return;
    }
    audioEngine.connect(el);
    audioEngine.resume();
  }

  function pause() {
    audioElsRef.current[activeIndexRef.current]?.pause();
  }

  function seekTo(fraction: number) {
    const el = audioElsRef.current[activeIndexRef.current];
    const duration = durations[activeIndexRef.current];
    if (!el || !duration) return;
    const target = fraction * duration;
    el.currentTime = target;
    setCurrentTime(target);
  }

  // 초 단위 절대 시간으로 강제 이동 — 30초 프리뷰 컷오프처럼 fraction이 아니라
  // 정확한 시각(target)이 필요한 경우용.
  function seekToSeconds(seconds: number) {
    const el = audioElsRef.current[activeIndexRef.current];
    if (!el) return;
    el.currentTime = seconds;
    setCurrentTime(seconds);
  }

  async function switchTo(index: number) {
    if (index === activeIndexRef.current) return;
    const from = audioElsRef.current[activeIndexRef.current];
    const to = audioElsRef.current[index];
    if (!from || !to) return;

    const wasPlaying = !from.paused;
    const resumeAt = from.currentTime;
    from.pause();
    to.currentTime = resumeAt;
    activeIndexRef.current = index;
    setActiveIndex(index);
    setCurrentTime(resumeAt);

    if (wasPlaying) {
      try {
        await to.play();
      } catch (e) {
        console.error("[VOICEMAP] 전환 후 재생 실패:", e);
        setError(e instanceof Error ? `재생 실패: ${e.message}` : "재생에 실패했습니다");
        return;
      }
      audioEngine.connect(to);
      audioEngine.resume();
    }
  }

  return {
    activeIndex,
    isPlaying,
    currentTime,
    duration: durations[activeIndex] ?? 0,
    error,
    audioRefCallbacks,
    togglePlay,
    pause,
    seekTo,
    seekToSeconds,
    switchTo,
  };
}
