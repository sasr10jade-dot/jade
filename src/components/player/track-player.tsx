"use client";

import { formatTime } from "@/lib/waveform";
import { hashSeed, gradientAngle } from "@/lib/track-visual";
import { useNativeAudioPlayer } from "@/lib/use-native-audio-player";
import { AudioVisualizer } from "@/components/audio-visualizer";

// 원곡(트랙) 전체를 처음부터 끝까지 들을 수 있는 플레이어 — 가이드가 아직 없거나
// 부족해도 Performer가 이 곡에 보컬을 제출할지 판단할 수 있어야 하므로 프리뷰 컷 없음.
// 재생 엔진은 네이티브 <audio> + 전역 이퀄라이저(useNativeAudioPlayer/audio-engine.ts) —
// 브라우저가 직접 관리하는 play/pause/timeupdate 이벤트를 그대로 신뢰.
export function TrackPlayer({
  trackId,
  audioUrl,
  title,
  thumbnailUrl,
}: {
  trackId: string;
  audioUrl: string;
  title: string;
  thumbnailUrl?: string | null;
}) {
  const player = useNativeAudioPlayer([audioUrl], trackId);

  const { isPlaying, currentTime, duration, error, audioRefCallbacks, togglePlay, seekTo } = player;
  const seed = hashSeed(trackId);
  const angle = gradientAngle(seed);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* 실제 DOM에 마운트된 <audio> — new Audio()로 만든 분리된 엘리먼트 대신 이걸 씀
          (일부 모바일 브라우저의 재생 정책 차이 회피). 화면엔 안 보이지만 재생엔 영향 없음. */}
      {/* eslint-disable-next-line react-hooks/refs -- audioRefCallbacks[0]은 useMemo로 만든 안정적인
          콜백 함수 값이지 ref.current 자체가 아님. React가 커밋 단계에서 나중에 호출할 뿐 렌더 중엔
          아무것도 읽거나 쓰지 않아 규칙이 우려하는 상황(렌더 중 ref 접근)이 아님 — 오탐. */}
      <audio ref={audioRefCallbacks[0]} src={audioUrl} preload="metadata" crossOrigin="anonymous" className="hidden" />

      {/* 블러 처리된 배경 — 앨범 아트가 있으면 그걸, 없으면 트랙 id 기반 그라데이션을 확대해서
          깔아 재생 중일 때 더 또렷해지도록(opacity) 해 "지금 듣고 있다"는 느낌을 준다. */}
      <div
        aria-hidden
        className={`absolute inset-0 scale-125 transition-opacity duration-700 ${isPlaying ? "opacity-100" : "opacity-50"}`}
        style={
          thumbnailUrl
            ? {
                backgroundImage: `url(${thumbnailUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(40px) saturate(1.8) brightness(0.85)",
              }
            : {
                background: `linear-gradient(${angle}deg, var(--accent), var(--secondary))`,
                filter: "blur(48px)",
              }
        }
      />
      <div className="absolute inset-0 bg-background/55" />

      <div className="relative p-5 sm:p-7">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "일시정지" : "재생"}
            className={`flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:scale-105 disabled:opacity-50 sm:size-20 ${
              isPlaying ? "shadow-[0_0_36px_var(--primary)]" : "shadow-lg"
            }`}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-7 sm:size-8">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 size-7 sm:size-8">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold sm:text-xl">{title}</p>
          </div>
        </div>

        <AudioVisualizer active={isPlaying} className="mt-4 h-16" />

        <div className="mt-5 flex items-center gap-2">
          <span className="w-9 shrink-0 text-right text-[11px] text-muted-foreground">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seekTo(Number(e.target.value) / (duration || 1))}
            aria-label="재생 위치"
            className="h-1 flex-1 accent-primary"
          />
          <span className="w-9 shrink-0 text-[11px] text-muted-foreground">{formatTime(duration)}</span>
        </div>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
