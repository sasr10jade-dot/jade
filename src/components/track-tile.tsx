"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatKRW } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { hashSeed, decorativeBars, gradientAngle } from "@/lib/track-visual";
import { useQueue, type QueueTrack } from "@/components/player/queue-context";

export type TileTrack = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  fileUrl: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  playCount: number;
  licenses: { price: number }[];
  creator: { name: string; nickname: string | null; displayNickname: boolean };
  guideCount: number;
};

// Discover 그리드, Home 가로 스크롤 행 양쪽에서 공유하는 트랙 타일 — 폭은 호출부가
// className으로 결정(가로 스크롤 행에서는 shrink-0 + 고정폭, 그리드에서는 w-full).
//
// 재생 버튼 — queue(같은 목록의 트랙들)를 넘겨주면 해당 목록 순서로 "연속 듣기" 큐를
// 만들고, 안 넘겨주면 이 트랙 하나만 재생(=큐 길이 1). fileUrl 없는 트랙(음원 미등록)은
// 버튼을 숨김. 재생 시작 위치는 큐 안에서 이 트랙의 id를 직접 찾아 정하므로(인덱스를
// 따로 받지 않음) fileUrl 없는 트랙이 필터링되어 순서가 밀려도 항상 정확하다.
export function TrackTile({
  track: t,
  className = "",
  queue,
}: {
  track: TileTrack;
  className?: string;
  queue?: TileTrack[];
}) {
  const { playQueue } = useQueue();
  const seed = hashSeed(t.id);
  const angle = gradientAngle(seed);
  const bars = decorativeBars(seed, 24);

  function handlePlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const source = queue && queue.length > 0 ? queue : [t];
    const tracks: QueueTrack[] = source
      .filter((track): track is TileTrack & { fileUrl: string } => !!track.fileUrl)
      .map((track) => ({
        id: track.id,
        title: track.title,
        thumbnailUrl: track.thumbnailUrl,
        fileUrl: track.fileUrl,
        creatorName: displayName(track.creator),
      }));
    if (tracks.length === 0) return;
    const startIndex = Math.max(0, tracks.findIndex((track) => track.id === t.id));
    playQueue(tracks, startIndex);
  }

  return (
    <Link
      href={`/track/${t.id}`}
      className={`group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50 ${className}`}
    >
      <div
        className="relative flex aspect-square items-end overflow-hidden p-4"
        style={t.thumbnailUrl ? undefined : { background: `linear-gradient(${angle}deg, var(--accent), var(--secondary))` }}
      >
        {t.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.thumbnailUrl} alt={t.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="absolute top-4 left-4 text-4xl font-black text-foreground/10">
              {t.title.slice(0, 1)}
            </span>
            <div className="relative flex h-10 w-full items-end gap-[2px]">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-primary/70 transition group-hover:bg-primary"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </>
        )}
        {/* 마우스(정밀 포인터)에서는 호버해야 어두운 오버레이+버튼이 나타나지만, 터치 기기
            (pointer: coarse)는 hover 상태 자체가 없어 버튼이 영영 안 보일 수 있다. 그래서
            터치 기기에서는 어두운 오버레이 없이 재생 버튼만 항상 보이게 하고, 정밀 포인터
            기기에서만 기존의 호버 게이팅(오버레이+버튼 페이드인)을 적용한다. */}
        <div className="absolute inset-0 flex items-center justify-center transition pointer-fine:bg-black/20 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100">
          {t.fileUrl ? (
            <button
              type="button"
              onClick={handlePlay}
              aria-label={`${t.title} 재생`}
              className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 size-5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 size-5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{t.title}</span>
          {t.licenses[0] && (
            <span className="shrink-0 text-sm font-semibold text-muted-foreground">
              {formatKRW(t.licenses[0].price)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{displayName(t.creator)}</p>
        <p className="text-xs text-muted-foreground">
          {t.bpm ?? "-"} BPM · {t.key ?? "-"} · {t.genre ?? "장르 미정"} · 재생 {t.playCount.toLocaleString()}회
        </p>
        {t.guideCount > 0 ? (
          <Badge variant="secondary" className="mt-1">
            가이드 보컬 포함
          </Badge>
        ) : (
          <Badge variant="outline" className="mt-1 border-dashed text-muted-foreground">
            가이드 대기중
          </Badge>
        )}
      </div>
    </Link>
  );
}
