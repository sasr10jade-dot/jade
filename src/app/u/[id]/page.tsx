import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TrackTile } from "@/components/track-tile";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { displayName } from "@/lib/display-name";
import { FollowButton } from "./follow-button";

const ROLE_LABEL: Record<string, string> = {
  CREATOR: "Creator",
  PERFORMER: "Performer",
  BUYER: "Buyer",
  ADMIN: "Admin",
};

const TRACK_INCLUDE = {
  licenses: { where: { type: "EXCLUSIVE" as const } },
  _count: { select: { guides: true } },
  creator: { select: { name: true, nickname: true, displayNickname: true } },
};

// 크리에이터/퍼포머 공개 프로필 — "이 사람 곡/보이스가 좋아서 찾아온" 탐색이 가능하도록
// 업로드곡·판매실적(Creator) 또는 제출 가이드·완료 콜라보(Performer)를 포트폴리오처럼 보여준다.
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nickname: true,
      displayNickname: true,
      role: true,
      createdAt: true,
      isSeedCreator: true,
    },
  });
  if (!user) notFound();

  const session = await auth();
  const [followerCount, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: id } }),
    session?.user
      ? prisma.follow
          .findUnique({ where: { followerId_followingId: { followerId: session.user.id, followingId: id } } })
          .then((f) => !!f)
      : Promise.resolve(false),
  ]);

  const name = displayName(user);
  const memberSince = user.createdAt.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  const isCreator = user.role === "CREATOR";
  const isPerformer = user.role === "PERFORMER";

  const tracks = isCreator
    ? await prisma.track.findMany({
        where: { creatorId: id, removedByAdmin: false },
        orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
        include: TRACK_INCLUDE,
      })
    : [];
  const totalPlays = tracks.reduce((sum, t) => sum + t.playCount, 0);
  const totalSales = isCreator
    ? await prisma.order.count({
        where: { track: { creatorId: id }, status: { in: ["ESCROW", "SETTLED"] } },
      })
    : 0;
  const reviews = isCreator
    ? await prisma.review.findMany({
        where: { targetId: id },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, nickname: true, displayNickname: true } } },
      })
    : [];
  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const guides = isPerformer
    ? await prisma.guide.findMany({
        where: { performerId: id },
        orderBy: { createdAt: "desc" },
        include: { track: { include: TRACK_INCLUDE } },
      })
    : [];
  const selectedCount = guides.filter((g) => g.status === "SELECTED").length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {name.slice(0, 1)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
              <Badge variant="outline">{ROLE_LABEL[user.role] ?? user.role}</Badge>
              {user.isSeedCreator && <Badge variant="secondary">초기 크리에이터</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {memberSince}부터 활동 · 팔로워 {followerCount.toLocaleString()}명
            </p>
          </div>
        </div>
        {session?.user && session.user.id !== id && (
          <FollowButton targetId={id} initialFollowing={isFollowing} />
        )}
      </div>

      {isCreator && (
        <>
          <div className="mt-6 flex gap-3">
            <StatCard label="업로드 트랙" value={tracks.length.toLocaleString()} />
            <StatCard label="누적 재생" value={totalPlays.toLocaleString()} />
            <StatCard label="판매 건수" value={totalSales.toLocaleString()} />
            <StatCard
              label="평점"
              value={avgRating !== null ? `${avgRating.toFixed(1)}점 (${reviews.length}개)` : "리뷰 없음"}
            />
          </div>

          {reviews.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold tracking-tight">받은 리뷰</h2>
              <div className="mt-4 space-y-3">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-primary" aria-label={`5점 만점에 ${r.rating}점`}>
                        <span aria-hidden="true">
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{displayName(r.author)}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="mt-10 text-xl font-bold tracking-tight">업로드한 트랙</h2>
          {tracks.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">아직 업로드한 트랙이 없습니다.</p>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tracks.map((t) => (
                <TrackTile key={t.id} track={{ ...t, guideCount: t._count.guides }} className="w-full" />
              ))}
            </div>
          )}
        </>
      )}

      {isPerformer && (
        <>
          <div className="mt-6 flex gap-3">
            <StatCard label="제출한 가이드" value={guides.length.toLocaleString()} />
            <StatCard label="완료된 콜라보" value={selectedCount.toLocaleString()} />
          </div>

          <h2 className="mt-10 text-xl font-bold tracking-tight">참여한 트랙</h2>
          {guides.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">아직 제출한 가이드가 없습니다.</p>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <div key={g.id} className="relative">
                  <TrackTile
                    track={{ ...g.track, guideCount: g.track._count.guides }}
                    className="w-full"
                  />
                  <Badge
                    variant={g.status === "SELECTED" ? "default" : "outline"}
                    className="absolute top-3 right-3"
                  >
                    {g.status === "SELECTED" ? "채택됨" : g.status === "REJECTED" ? "미채택" : "심사중"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
