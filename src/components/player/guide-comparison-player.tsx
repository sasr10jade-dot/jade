"use client";

import { formatTime } from "@/lib/waveform";
import { hashSeed, gradientAngle } from "@/lib/track-visual";
import { useNativeAudioPlayer } from "@/lib/use-native-audio-player";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export interface GuideOption {
  id: string;
  label: string;
  performer: string;
  splitAsk: string;
  audioUrl: string;
}

// 동일 구간 A/B 전환, 30초 프리뷰 제한(바이어만 — Performer/Creator는 전곡 청취 가능해야
// 어떤 곡에 가이드를 제출할지 판단할 수 있다). track-player.tsx와 레이아웃(비주얼라이저 +
// 가로 진행바) 통일.
//
// 가이드가 1건뿐이면 비교 UI(A/B 전환 버튼, 두 번째 <audio>) 없이 단일 플레이어로 동작 —
// 재생 엔진은 네이티브 <audio> + 전역 이퀄라이저(useNativeAudioPlayer) — 준비된 가이드
// 전부 미리 별도의 <audio> 엘리먼트로 준비해두고, switchTo()로 재생 위치만 맞춰서 즉시 바꿔 끼운다.
const PREVIEW_SECONDS = 30;

export function GuideComparisonPlayer({
  trackId,
  guides,
  previewOnly = false,
  thumbnailUrl,
}: {
  trackId: string;
  guides: [GuideOption] | [GuideOption, GuideOption];
  previewOnly?: boolean;
  thumbnailUrl?: string | null;
}) {
  const player = useNativeAudioPlayer(
    guides.map((g) => g.audioUrl),
    trackId
  );
  const { activeIndex, isPlaying, currentTime, duration, error, audioRefCallbacks, togglePlay, pause, seekTo, seekToSeconds, switchTo } = player;

  // 30초 프리뷰 컷오프 — 재생 위치가 넘어가면 즉시 정지하고 정확히 30초 지점으로 고정.
  useEffect(() => {
    if (previewOnly && currentTime >= PREVIEW_SECONDS) {
      pause();
      seekToSeconds(PREVIEW_SECONDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOnly, currentTime]);

  const active = guides[activeIndex];
  const effectiveDuration = previewOnly ? Math.min(duration, PREVIEW_SECONDS) : duration;
  const seed = hashSeed(trackId);
  const angle = gradientAngle(seed);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <audio ref={audioRefCallbacks[0]} src={guides[0].audioUrl} preload="metadata" crossOrigin="anonymous" className="hidden" />
      {guides[1] && (
        // eslint-disable-next-line react-hooks/refs -- track-player.tsx 참고: useMemo로 만든 안정적인 콜백 함수 값이라 렌더 중 ref.current 접근이 아님(오탐).
        <audio ref={audioRefCallbacks[1]} src={guides[1].audioUrl} preload="metadata" crossOrigin="anonymous" className="hidden" />
      )}
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
            <p className="truncate text-lg font-bold sm:text-xl">{active.label}</p>
            <p className="truncate text-sm text-muted-foreground">{active.performer}</p>
          </div>
        </div>

        <AudioVisualizer active={isPlaying} className="mt-4 h-16" />

        <div className="mt-5 flex items-center gap-2">
          <span className="w-9 shrink-0 text-right text-[11px] text-muted-foreground">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={effectiveDuration || 0}
            value={Math.min(currentTime, effectiveDuration || 0)}
            onChange={(e) => seekTo(Number(e.target.value) / (duration || 1))}
            aria-label={`재생 위치 (${active.label})`}
            className="h-1 flex-1 accent-primary"
          />
          <span className="w-9 shrink-0 text-[11px] text-muted-foreground">{formatTime(effectiveDuration)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {guides.length > 1 && (
            <div className="flex gap-2">
              {guides.map((g, i) => (
                <Button
                  key={g.id}
                  size="sm"
                  variant={i === activeIndex ? "default" : "outline"}
                  onClick={() => switchTo(i)}
                >
                  {i === 0 ? "A로 전환" : "B로 전환"}
                </Button>
              ))}
            </div>
          )}
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            제안 Split {active.splitAsk}
          </span>
        </div>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

        {previewOnly && (
          <p className="mt-3 text-xs text-muted-foreground">
            30초 프리뷰 (바이어) — 원본은 구매 후 다운로드 가능
          </p>
        )}
      </div>
    </div>
  );
}
