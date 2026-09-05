import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { settleExpiredEscrows } from "@/lib/settlement";
import { getCreatorStats } from "@/lib/creator-stats";
import { getPerformerStats } from "@/lib/performer-stats";
import { StudioTrackThumbnail } from "./track-thumbnail";
import { StatsSection } from "./stats-section";
import { PerformerStatsSection } from "./performer-stats-section";
import { UnpublishButton } from "./unpublish-button";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "가이드 대기중",
  MATCHING: "매칭중",
  GUIDE_READY: "가이드 확보",
  SPLIT_AGREED: "판매중",
  LISTED: "판매중",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  ESCROW: "에스크로 보호 중",
  SETTLED: "정산 완료",
  DISPUTED: "이의 제기됨",
  REFUNDED_FULL: "전액 환불",
  REFUNDED_PARTIAL: "부분 환불",
};

const GUIDE_STATUS_LABEL: Record<string, string> = {
  PENDING: "심사중",
  SELECTED: "채택됨",
  REJECTED: "미채택",
};

export default async function StudioPage() {
  const session = await auth();
  await settleExpiredEscrows();
  const isCreator = session?.user?.role === "CREATOR";
  const isPerformer = session?.user?.role === "PERFORMER";

  const tracks = isCreator
    ? await prisma.track.findMany({
        where: { creatorId: session!.user.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { guides: true, orders: true } } },
      })
    : [];

  const orders = isCreator
    ? await prisma.order.findMany({
        where: { track: { creatorId: session!.user.id } },
        orderBy: { purchasedAt: "desc" },
        include: { track: { select: { title: true } }, buyer: { select: { name: true } } },
      })
    : [];
  const pendingNet = orders
    .filter((o) => o.status === "ESCROW")
    .reduce((sum, o) => sum + o.netAmount, 0);
  const settledNet = orders
    .filter((o) => o.status === "SETTLED")
    .reduce((sum, o) => sum + o.netAmount, 0);

  const stats = isCreator ? await getCreatorStats(session!.user.id) : null;

  const myGuides = isPerformer
    ? await prisma.guide.findMany({
        where: { performerId: session!.user.id },
        orderBy: { createdAt: "desc" },
        include: { track: { select: { id: true, title: true, thumbnailUrl: true } } },
      })
    : [];
  const performerStats = isPerformer ? await getPerformerStats(session!.user.id) : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPerformer ? "내 가이드 제출, Split 협상 현황" : "내 트랙, 가이드 관리"}
          </p>
        </div>
        {isPerformer ? (
          <Link href="/matching">
            <Button>가이드 모집 둘러보기</Button>
          </Link>
        ) : (
          <Link href="/upload">
            <Button>+ 새 트랙 업로드</Button>
          </Link>
        )}
      </div>

      {!isCreator && !isPerformer && (
        <p className="mt-4 rounded-lg border-l-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          Studio는 Creator/Performer 계정 전용 화면입니다. 해당 역할로 가입 후 이용해주세요.
        </p>
      )}

      {stats && stats.totalTracks > 0 && <StatsSection {...stats} />}
      {performerStats && myGuides.length > 0 && <PerformerStatsSection {...performerStats} />}

      {isPerformer && (
        <>
          {myGuides.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              아직 제출한 가이드가 없습니다. 위 버튼으로 트랙을 둘러보고 첫 가이드를 제출해보세요.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {myGuides.map((g) => (
                <Link
                  key={g.id}
                  href={`/track/${g.track.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm transition hover:border-primary/50"
                >
                  <span className="font-semibold">{g.track.title}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>제안 분배율 {Math.round(g.splitAsk)}%</span>
                    <Badge variant={g.status === "SELECTED" ? "default" : "outline"}>
                      {GUIDE_STATUS_LABEL[g.status] ?? g.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            채택된 가이드의 Split 협상 진행 상황은{" "}
            <Link href="/settings/split" className="underline">
              Split 에디터
            </Link>
            에서 확인하세요.
          </p>
        </>
      )}

      {isCreator && tracks.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          아직 업로드한 트랙이 없습니다. 위 버튼으로 첫 트랙을 업로드해보세요.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {tracks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
            <StudioTrackThumbnail trackId={t.id} thumbnailUrl={t.thumbnailUrl} />
            <Link href={`/track/${t.id}`} className="flex flex-1 items-center justify-between hover:opacity-80">
              <span className="font-semibold">{t.title}</span>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  가이드 {t._count.guides}건 · 판매 {t._count.orders}건
                </span>
                {t.removedByCreator && <Badge variant="destructive">비공개</Badge>}
                <Badge variant="outline">{STATUS_LABEL[t.status] ?? t.status}</Badge>
              </div>
            </Link>
            <UnpublishButton trackId={t.id} removed={t.removedByCreator} />
            <Link href={`/studio/${t.id}/edit`}>
              <Button variant="outline" size="sm">
                수정
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {isCreator && orders.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">정산 내역</h2>
          <div className="mt-2 flex gap-3 text-sm">
            <span className="text-muted-foreground">
              에스크로 대기 <span className="font-semibold text-foreground">{formatKRW(pendingNet)}</span>
            </span>
            <span className="text-muted-foreground">
              정산 완료 <span className="font-semibold text-foreground">{formatKRW(settledNet)}</span>
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{o.track.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {o.buyer.name} · {o.purchasedAt.toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">정산액 {formatKRW(o.netAmount)}</span>
                  <Badge variant="outline">{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
