import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GuideComparisonPlayer } from "@/components/player/guide-comparison-player";
import { TrackPlayer } from "@/components/player/track-player";
import { GuideSubmitForm } from "./guide-submit-form";
import { SplitProposeForm } from "./split-propose-form";
import { PriceOfferSection } from "./price-offer-section";
import { LikeButton } from "./like-button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { displayName } from "@/lib/display-name";

// FR-02 status values that mean "already confirmed, no longer accepting guides" (EC-04).
const CLOSED_STATUSES = new Set(["SPLIT_AGREED", "LISTED"]);

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, track] = await Promise.all([
    auth(),
    prisma.track.findUnique({
      where: { id },
      include: {
        licenses: true,
        guides: { include: { performer: { select: { name: true } } } },
        split: true,
        creator: { select: { name: true, nickname: true, displayNickname: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { name: true, nickname: true, displayNickname: true } } },
        },
        _count: { select: { likes: true } },
      },
    }),
  ]);
  if (!track) notFound();

  const likedByMe = session?.user
    ? Boolean(
        await prisma.like.findUnique({
          where: { userId_trackId: { userId: session.user.id, trackId: track.id } },
          select: { id: true },
        })
      )
    : false;

  const avgRating = track.reviews.length
    ? track.reviews.reduce((sum, r) => sum + r.rating, 0) / track.reviews.length
    : null;

  const exclusive = track.licenses.find((l) => l.type === "EXCLUSIVE");
  const nonExclusive = track.licenses.find((l) => l.type === "NON_EXCLUSIVE");
  const [guideA, guideB] = track.guides;

  const isPerformer = session?.user?.role === "PERFORMER";
  const myGuide = isPerformer
    ? track.guides.find((g) => g.performerId === session!.user.id)
    : undefined;
  const trackClosed = CLOSED_STATUSES.has(track.status);
  const isOwner = session?.user?.role === "CREATOR" && track.creatorId === session.user.id;

  const offers = session?.user
    ? await prisma.priceOffer.findMany({
        where: isOwner ? { trackId: track.id } : { trackId: track.id, buyerId: session.user.id },
        include: { buyer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          {track.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.thumbnailUrl}
              alt={track.title}
              className="size-20 shrink-0 rounded-xl object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{track.title}</h1>
            <Link
              href={`/u/${track.creatorId}`}
              className="mt-1 inline-block text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {displayName(track.creator)}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {track.bpm ?? "-"} BPM · {track.key ?? "-"} · {track.genre ?? "-"} ·{" "}
              {track.mood ?? "-"}
            </p>
            {avgRating !== null && (
              <p className="mt-1 text-sm text-primary">
                <span aria-hidden="true">★</span> 평균 {avgRating.toFixed(1)}점{" "}
                <span className="text-muted-foreground">({track.reviews.length}개 리뷰)</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {session?.user && (
            <LikeButton trackId={track.id} initialLiked={likedByMe} initialCount={track._count.likes} />
          )}
          <Link href={`/checkout/${track.id}`}>
            <Button>구매하기 →</Button>
          </Link>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Card className="flex-1">
          <CardContent>
            <p className="text-xs text-muted-foreground">Exclusive</p>
            <p className="text-lg font-semibold">
              {exclusive ? formatKRW(exclusive.price) : "미설정"}
            </p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent>
            <p className="text-xs text-muted-foreground">Non-Exclusive</p>
            <p className="text-lg font-semibold">
              {nonExclusive ? formatKRW(nonExclusive.price) : "미설정"}
            </p>
          </CardContent>
        </Card>
      </div>

      {session?.user && (isOwner || session.user.role !== "PERFORMER") && (
        <>
          <h2 className="mt-10 text-lg font-semibold">가격 제안 / 흥정</h2>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "구매자가 제안한 가격에 수락, 거절, 또는 역제안할 수 있습니다."
              : "정가 대신 원하는 가격을 제안해볼 수 있습니다. 크리에이터가 수락하면 바로 구매가 확정됩니다."}
          </p>
          <PriceOfferSection
            trackId={track.id}
            licenses={track.licenses.map((l) => ({ id: l.id, type: l.type, price: l.price }))}
            offers={offers}
            isOwner={isOwner}
            viewerId={session.user.id}
          />
        </>
      )}

      {track.fileUrl && (
        <>
          <h2 className="mt-10 text-lg font-semibold">원곡 듣기</h2>
          <p className="text-sm text-muted-foreground">
            전곡 재생 — Performer가 가이드 제출 여부를 판단할 수 있도록 프리뷰 제한 없음
          </p>
          <div className="mt-4">
            <TrackPlayer
              trackId={track.id}
              audioUrl={track.fileUrl}
              title={track.title}
              thumbnailUrl={track.thumbnailUrl}
            />
          </div>
        </>
      )}

      {track.lyrics && (
        <>
          <h2 className="mt-10 text-lg font-semibold">가사</h2>
          <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{track.lyrics}</p>
        </>
      )}

      {track.sheetMusicUrl && (
        <>
          <h2 className="mt-10 text-lg font-semibold">악보</h2>
          <a
            href={track.sheetMusicUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border p-3 text-sm text-primary hover:underline"
          >
            악보 보기 →
          </a>
        </>
      )}

      <h2 className="mt-10 text-lg font-semibold">가이드 비교</h2>
      <p className="text-sm text-muted-foreground">
        동일 구간 A/B 전환, 파형 표시 — 구매 전 전곡 청취 가능
      </p>

      <div className="mt-4">
        {guideA && guideB ? (
          <GuideComparisonPlayer
            trackId={track.id}
            thumbnailUrl={track.thumbnailUrl}
            guides={[
              {
                id: guideA.id,
                label: "가이드 A",
                performer: guideA.performer.name,
                // Split.splitAsk is the Performer's proposed share; display convention is
                // "Creator / Performer" throughout (matches PRD Section 5 default 80/20).
                splitAsk: `${100 - Math.round(guideA.splitAsk)} / ${Math.round(guideA.splitAsk)}`,
                audioUrl: guideA.audioUrl,
              },
              {
                id: guideB.id,
                label: "가이드 B",
                performer: guideB.performer.name,
                splitAsk: `${100 - Math.round(guideB.splitAsk)} / ${Math.round(guideB.splitAsk)}`,
                audioUrl: guideB.audioUrl,
              },
            ]}
            // 바이어도 구매 결정을 위해 전곡을 들을 수 있어야 하므로 프리뷰 제한 없음.
          />
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            비교할 가이드가 아직 2개 미만입니다. (제출된 가이드: {track.guides.length}건)
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1.5">
          가이드 없는 트랙은 노출 순위 -70%
        </Badge>
      </div>

      <h2 className="mt-10 text-lg font-semibold">
        리뷰{track.reviews.length > 0 && ` (${track.reviews.length})`}
      </h2>
      {track.reviews.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          아직 리뷰가 없습니다. 구매 후 정산이 완료되면 리뷰를 남길 수 있습니다.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {track.reviews.map((r) => (
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
      )}

      {isPerformer && (
        <>
          <h2 className="mt-10 text-lg font-semibold">가이드 제출</h2>
          {myGuide ? (
            <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              이미 이 트랙에 가이드를 제출했습니다. (희망 분배율{" "}
              {Math.round(myGuide.splitAsk)}% · 상태: {myGuide.status})
            </p>
          ) : trackClosed ? (
            <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              이미 확정된 트랙입니다. 가이드를 제출할 수 없습니다.
            </p>
          ) : (
            <GuideSubmitForm trackId={track.id} />
          )}
        </>
      )}

      {isOwner && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Split 제안</h2>
          {track.split ? (
            <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              이미 Split 협의가 진행 중입니다. 자세한 내용은{" "}
              <Link href="/settings/split" className="underline">
                Split 에디터
              </Link>
              에서 확인하세요.
            </p>
          ) : track.guides.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              제출된 가이드가 있어야 Split을 제안할 수 있습니다.
            </p>
          ) : (
            <SplitProposeForm
              trackId={track.id}
              performers={track.guides.map((g) => ({
                performerId: g.performerId,
                name: g.performer.name,
                splitAsk: g.splitAsk,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
