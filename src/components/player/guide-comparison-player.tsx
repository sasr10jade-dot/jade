"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { extractPeaks, formatTime } from "@/lib/waveform";
import { hashSeed, gradientAngle } from "@/lib/track-visual";
import { useNativeAudioPlayer } from "@/lib/use-native-audio-player";
import { AudioVisualizer } from "@/components/audio-visualizer";

export interface GuideOption {
  id: string;
  label: string;
  performer: string;
  splitAsk: string;
  audioUrl: string;
}

// 동일 구간 A/B 전환, 파형 표시, 30초 프리뷰 제한(바이어만 — Performer/Creator는 전곡
// 청취 가능해야 어떤 곡에 가이드를 제출할지 판단할 수 있다).
//
// 재생 엔진은 네이티브 <audio> + 전역 이퀄라이저(useNativeAudioPlayer) — 두 가이드 모두
// 미리 별도의 <audio> 엘리먼트로 준비해두고, switchTo()로 재생 위치만 맞춰서 즉시 바꿔 끼운다.
const PREVIEW_SECONDS = 30;
const BAR_COUNT = 64;

export function GuideComparisonPlayer({
  trackId,
  guides,
  previewOnly = false,
  thumbnailUrl,
}: {
  trackId: string;
  guides: [GuideOption, GuideOption];
  previewOnly?: boolean;
  thumbnailUrl?: string | null;
}) {
  const player = useNativeAudioPlayer(
    [guides[0].audioUrl, guides[1].audioUrl],
    trackId
  );
  const { activeIndex, isPlaying, currentTime, duration, error, audioRefCallbacks, togglePlay, pause, seekTo, seekToSeconds, switchTo } = player;

  const [peaksByGuide, setPeaksByGuide] = useState<Record<string, number[]>>({});

  useEffect(() => {
    let cancelled = false;
    guides.forEach((guide) => {
      extractPeaks(guide.audioUrl, BAR_COUNT)
        .then((p) => {
          if (!cancelled) setPeaksByGuide((prev) => ({ ...prev, [guide.id]: p }));
        })
        .catch(() => {
          if (!cancelled) setPeaksByGuide((prev) => ({ ...prev, [guide.id]: [] }));
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guides[0].id, guides[1].id]);

  // 30초 프리뷰 컷오프 — 재생 위치가 넘어가면 즉시 정지하고 정확히 30초 지점으로 고정.
  useEffect(() => {
    if (previewOnly && currentTime >= PREVIEW_SECONDS) {
      pause();
      seekToSeconds(PREVIEW_SECONDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOnly, currentTime]);

  const active = guides[activeIndex];
  const peaks = peaksByGuide[active.id];
  const effectiveDuration = previewOnly ? Math.min(duration, PREVIEW_SECONDS) : duration;
  const progressFraction = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;
  const seed = hashSeed(trackId);
  const angle = gradientAngle(seed);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <audio ref={audioRefCallbacks[0]} src={guides[0].audioUrl} preload="metadata" className="hidden" />
      {/* eslint-disable-next-line react-hooks/refs -- track-player.tsx 참고: useMemo로 만든 안정적인
          콜백 함수 값이라 렌더 중 ref.current 접근이 아님(오탐). */}
      <audio ref={audioRefCallbacks[1]} src={guides[1].audioUrl} preload="metadata" className="hidden" />
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
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold sm:text-xl">{active.label}</p>
                <p className="truncate text-sm text-muted-foreground">{active.performer}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(effectiveDuration)}
              </span>
            </div>
          </div>
        </div>

        <AudioVisualizer active={isPlaying} className="mt-4 h-10" />

        <div
          role="slider"
          tabIndex={0}
          aria-label={`재생 위치 (${active.label})`}
          aria-valuemin={0}
          aria-valuemax={Math.max(1, Math.round(effectiveDuration))}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} / ${formatTime(effectiveDuration)}`}
          className="mt-5 flex h-24 cursor-pointer items-end gap-[2px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-28"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
          onKeyDown={(e) => {
            if (!duration) return;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              seekTo(Math.min(1, (currentTime + 5) / duration));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              seekTo(Math.max(0, (currentTime - 5) / duration));
            } else if (e.key === "Home") {
              e.preventDefault();
              seekTo(0);
            } else if (e.key === "End") {
              e.preventDefault();
              seekTo(previewOnly ? PREVIEW_SECONDS / duration : 1);
            }
          }}
        >
          {(peaks ?? Array(BAR_COUNT).fill(0)).map((p, i) => {
            const played = i / BAR_COUNT < progressFraction;
            const heightPct = Math.max(8, Math.round(p * 100));
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  played ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-foreground/20"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
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
          <span className="text-xs font-medium text-muted-foreground">
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
