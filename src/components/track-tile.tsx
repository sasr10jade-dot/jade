import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatKRW } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { hashSeed, decorativeBars, gradientAngle } from "@/lib/track-visual";

export type TileTrack = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
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
export function TrackTile({ track: t, className = "" }: { track: TileTrack; className?: string }) {
  const seed = hashSeed(t.id);
  const angle = gradientAngle(seed);
  const bars = decorativeBars(seed, 24);

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
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 size-5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
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
