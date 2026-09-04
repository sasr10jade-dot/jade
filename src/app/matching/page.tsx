import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/display-name";
import { hashSeed, gradientAngle } from "@/lib/track-visual";

// Split이 이미 합의됐거나(SPLIT_AGREED) 확정 판매 중(LISTED)인 트랙은 더 이상 가이드를
// 받지 않음(EC-04) — 트랙 상세 페이지의 가이드 제출 마감 조건과 동일하게 맞춤.
const CLOSED_STATUSES = new Set(["SPLIT_AGREED", "LISTED"]);

// Performer(가수·아마추어 보컬) 전용 탐색 페이지 — 일반 Discover는 "구매" 목적 탐색이라
// 라이선스 가격이 앞에 나오지만, 여기는 "이 곡에 보컬을 붙일지" 판단에 필요한 정보
// (BPM/Key/무드/가사 유무, 제안 Split, 현재 가이드 수)만 보여준다. 가이드가 적은 트랙을
// 우선 노출해 아직 보컬이 없는 곡부터 채워지도록 정렬.
export default async function MatchingPage() {
  const tracks = await prisma.track.findMany({
    where: { removedByAdmin: false, status: { notIn: [...CLOSED_STATUSES] } },
    orderBy: [{ createdAt: "desc" }],
    include: {
      _count: { select: { guides: true } },
      creator: { select: { name: true, nickname: true, displayNickname: true } },
    },
  });
  tracks.sort((a, b) => a._count.guides - b._count.guides);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">가이드 모집 중</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        아직 가이드 보컬이 부족한 트랙 — 전문 보컬이든 아마추어든, 마음에 드는 곡에 가이드를 제출해보세요.
        가이드가 적은 트랙부터 보여드립니다.
      </p>

      {tracks.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">현재 모집 중인 트랙이 없습니다.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => {
            const seed = hashSeed(t.id);
            const angle = gradientAngle(seed);
            return (
              <Link
                key={t.id}
                href={`/track/${t.id}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50"
              >
                <div
                  className="relative flex aspect-[3/1] items-end overflow-hidden p-4"
                  style={
                    t.thumbnailUrl
                      ? undefined
                      : { background: `linear-gradient(${angle}deg, var(--accent), var(--secondary))` }
                  }
                >
                  {t.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.thumbnailUrl}
                      alt={t.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="relative flex w-full items-center justify-between">
                    <span className="truncate font-bold text-white">{t.title}</span>
                    <Badge className="shrink-0">가이드 {t._count.guides}건</Badge>
                  </div>
                </div>

                <div className="space-y-1 p-4">
                  <p className="truncate text-xs text-muted-foreground">{displayName(t.creator)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.bpm ?? "-"} BPM · {t.key ?? "-"} · {t.genre ?? "장르 미정"} · {t.mood ?? "무드 미정"}
                  </p>
                  {t.lyrics && (
                    <Badge variant="outline" className="mt-1">
                      가사 있음
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
