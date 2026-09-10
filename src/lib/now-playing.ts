// 앱 전체에서 오디오가 동시에 두 개 재생되는 걸 막기 위한 최소한의 조정 장치.
// 트랙 상세 페이지의 개별 플레이어(use-native-audio-player)와 하단 큐 플레이어
// (QueueProvider) 둘 다 재생을 "시작"하기 직전에 claimPlayback(자신을 멈추는 함수)을
// 호출한다 — 그러면 직전까지 재생 중이던 다른 쪽이 자동으로 멈춘다.
let currentStopper: (() => void) | null = null;

export function claimPlayback(stop: () => void) {
  if (currentStopper && currentStopper !== stop) currentStopper();
  currentStopper = stop;
}

// 트랙을 빠르게 연속 전환하면 이전 el.play() 프라미스가 새 load/pause에 의해 정상적으로
// "중단"되어 AbortError로 reject된다 — 실제 재생 실패가 아니므로 에러 상태로 취급하면 안 됨.
export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}
