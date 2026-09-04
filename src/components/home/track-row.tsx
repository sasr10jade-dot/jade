"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Track, License, User } from "@prisma/client";
import { TrackTile } from "@/components/track-tile";

export type HomeTrack = Track & {
  licenses: License[];
  _count: { guides: number };
  creator: Pick<User, "name" | "nickname" | "displayNickname">;
};

const AUTO_SCROLL_INTERVAL_MS = 3200;

export function TrackRow({
  title,
  tracks,
  viewAllHref,
  reverse = false,
}: {
  title: string;
  tracks: HomeTrack[];
  viewAllHref: string;
  /** true면 오른쪽→왼쪽으로 자동 스크롤 — 위아래 행이 서로 반대 방향으로 교차되게 흐르도록. */
  reverse?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || tracks.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (reverse) {
      el.scrollLeft = el.scrollWidth;
    }

    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      const first = el.firstElementChild as HTMLElement | null;
      const step = first ? first.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;

      if (reverse) {
        const atStart = el.scrollLeft <= 4;
        if (atStart) {
          el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
        } else {
          el.scrollBy({ left: -step, behavior: "smooth" });
        }
        return;
      }

      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [tracks.length, reverse]);

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };

  const withGuideCount = tracks.map((t) => ({ ...t, guideCount: t._count.guides }));

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <Link href={viewAllHref} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          전체보기 →
        </Link>
      </div>
      {/* 자동 스크롤 — 3.2초마다 한 칸씩 이동, 끝에 닿으면 처음으로 되돌아감.
          hover/touch/focus 중에는 멈춰서 사용자가 직접 넘겨보는 걸 방해하지 않음. */}
      <div
        ref={scrollerRef}
        onPointerEnter={pause}
        onPointerLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onFocus={pause}
        onBlur={resume}
        className="mt-4 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 scrollbar-hide"
      >
        {withGuideCount.map((t) => (
          <TrackTile
            key={t.id}
            track={t}
            className="w-52 shrink-0 snap-start sm:w-56"
            queue={withGuideCount}
          />
        ))}
      </div>
    </section>
  );
}
