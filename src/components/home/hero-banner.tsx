"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { hashSeed, decorativeBars, gradientAngle } from "@/lib/track-visual";
import type { HomeTrack } from "@/components/home/track-row";

const AUTO_SCROLL_INTERVAL_MS = 5000;

export function HeroBanner({ tracks }: { tracks: HomeTrack[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || tracks.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + el.clientWidth, behavior: "smooth" });
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [tracks.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };
  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  if (tracks.length === 0) {
    return (
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight">소리를 잇는 다리.</h1>
          <p className="mt-4 text-muted-foreground">
            작곡가와 보컬을 연결하고, 구매와 저작권을 하나의 플로우로 관리하는 음악 마켓플레이스.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/discover">
              <Button size="lg">Discover 둘러보기</Button>
            </Link>
            <Link href="/upload">
              <Button size="lg" variant="outline">
                트랙 업로드
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* 자동 스크롤 — 5초마다 한 장씩 이동, 끝에 닿으면 처음으로 되돌아감.
          hover/touch/focus 중에는 멈춰서 스와이프를 방해하지 않음. */}
      <div
        ref={scrollerRef}
        onPointerEnter={pause}
        onPointerLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onFocus={pause}
        onBlur={resume}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
      >
        {tracks.map((track, i) => {
          const seed = hashSeed(track.id);
          const bars = decorativeBars(seed, 40);
          const price = track.licenses[0]?.price;
          return (
            <div key={track.id} className="w-full shrink-0 snap-center">
              <div
                className="relative flex min-h-[344px] flex-col justify-end px-5 py-16 sm:px-10"
                style={
                  track.thumbnailUrl
                    ? undefined
                    : { background: `linear-gradient(${gradientAngle(seed)}deg, var(--accent), var(--secondary))` }
                }
              >
                {track.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
                {!track.thumbnailUrl && (
                  <div className="absolute inset-x-0 bottom-0 flex h-32 items-end gap-[3px] px-5 opacity-30 sm:px-10">
                    {bars.map((h, bi) => (
                      <div key={bi} className="flex-1 rounded-full bg-primary" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                )}
                <div className="relative mx-auto w-full max-w-6xl">
                  <p className="text-sm font-medium text-primary">🔥 인기 트랙 {i + 1}위</p>
                  <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                    {track.title}
                  </h1>
                  <p className="mt-2 text-muted-foreground">
                    {displayName(track.creator)} · {track.playCount.toLocaleString()}회 재생
                    {price ? ` · ${formatKRW(price)}부터` : ""}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={`/track/${track.id}`}>
                      <Button size="lg">지금 듣기 →</Button>
                    </Link>
                    <Link href="/discover">
                      <Button size="lg" variant="outline">
                        Discover 둘러보기
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tracks.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {tracks.map((track, i) => (
            <button
              key={track.id}
              type="button"
              aria-label={`${i + 1}번째 배너로 이동`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-primary/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
