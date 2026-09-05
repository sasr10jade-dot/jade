"use client";

import { useQueue } from "./queue-context";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 큐 바가 콘텐츠를 가리지 않도록 활성 상태일 때만 같은 높이의 여백을 남겨준다 —
// 레이아웃에서 <main> 바로 아래에 렌더링.
export function QueueBarSpacer() {
  const { queue } = useQueue();
  if (queue.length === 0) return null;
  return <div className="h-[57px]" />;
}

// 레이아웃 최상단에 항상 마운트, 큐가 비어있으면 아무것도 렌더링하지 않음 — 재생 중일
// 때만 화면 하단에 고정 표시되는 미니 플레이어. 페이지를 이동해도(라우트 전환) 계속
// 떠있고 재생이 끊기지 않는다(QueueProvider가 레이아웃에 한 번만 마운트되기 때문).
export function QueueBar() {
  const {
    currentTrack,
    position,
    total,
    isPlaying,
    currentTime,
    duration,
    shuffle,
    repeat,
    togglePlay,
    next,
    prev,
    seekTo,
    close,
    toggleShuffle,
    toggleRepeat,
  } = useQueue();
  if (!currentTrack) return null;

  const atStart = position === 0;
  const atEnd = position >= total - 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            {currentTrack.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentTrack.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">{currentTrack.title.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{currentTrack.title}</p>
            <p className="truncate text-xs text-muted-foreground">{currentTrack.creatorName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label="랜덤 재생"
            aria-pressed={shuffle}
            className={`hidden rounded-md p-2 transition hover:bg-muted sm:block ${shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
              <path
                d="M4 6h3.5l9 12H20M4 18h3.5l2.5-3.3M14.5 6H20m0 0-2.5 2.5M20 6l-2.5-2.5M20 18l-2.5 2.5M20 18l-2.5-2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={prev}
            disabled={atStart && !repeat}
            aria-label="이전 곡"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M6 6h2v12H6zM20 6v12l-9-6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "일시정지" : "재생"}
            className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 size-4">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={atEnd && !repeat}
            aria-label="다음 곡"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M16 6h2v12h-2zM4 6v12l9-6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleRepeat}
            aria-label="반복 재생"
            aria-pressed={repeat}
            className={`hidden rounded-md p-2 transition hover:bg-muted sm:block ${repeat ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
              <path
                d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="hidden flex-1 items-center gap-2 sm:flex">
          <span className="w-9 shrink-0 text-right text-[11px] text-muted-foreground">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="재생 위치"
            className="h-1 flex-1 accent-primary"
          />
          <span className="w-9 shrink-0 text-[11px] text-muted-foreground">{formatTime(duration)}</span>
        </div>

        <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
          {position + 1} / {total}
        </span>

        <button
          type="button"
          onClick={close}
          aria-label="플레이어 닫기"
          className="shrink-0 rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
