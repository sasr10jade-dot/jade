import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { settleExpiredEscrows, notifyUpcomingEscrowReviews } from "@/lib/settlement";
import { ApproveOrderButton } from "./approve-order-button";
import { DisputeButton } from "./dispute-button";
import { ReviewForm } from "./review-form";

const DOWNLOADABLE_STATUSES = new Set(["ESCROW", "SETTLED"]);

const STATUS_LABEL: Record<string, string> = {
  ESCROW: "에스크로 보호 중",
  SETTLED: "정산 완료",
  DISPUTED: "이의 제기됨",
  REFUNDED_FULL: "전액 환불",
  REFUNDED_PARTIAL: "부분 환불",
};

const LICENSE_LABEL: Record<string, string> = {
  EXCLUSIVE: "Exclusive",
  NON_EXCLUSIVE: "Non-Exclusive",
};

function daysLeft(escrowEndsAt: Date | null) {
  if (!escrowEndsAt) return null;
  const ms = escrowEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default async function OrdersPage() {
  const session = await auth();
  await settleExpiredEscrows();
  await notifyUpcomingEscrowReviews();

  const orders = session?.user
    ? await prisma.order.findMany({
        where: { buyerId: session.user.id },
        orderBy: { purchasedAt: "desc" },
        include: {
          track: { select: { id: true, title: true, fileUrl: true } },
          license: { select: { type: true } },
          review: true,
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">구매내역</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        구매한 라이선스와 에스크로 상태
      </p>

      {orders.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">아직 구매한 트랙이 없습니다.</p>
      )}

      <div className="mt-6 space-y-3">
        {orders.map((order) => {
          const left = daysLeft(order.escrowEndsAt);
          const canDownload = DOWNLOADABLE_STATUSES.has(order.status) && !!order.track.fileUrl;
          return (
            <div key={order.id} className="rounded-lg border p-4">
              <Link href={`/track/${order.track.id}`} className="block hover:opacity-80">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{order.track.title}</span>
                  <Badge variant="outline">{STATUS_LABEL[order.status] ?? order.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {LICENSE_LABEL[order.license.type] ?? order.license.type} ·{" "}
                  {order.purchasedAt.toLocaleDateString("ko-KR")}
                  {order.downloaded && " · 다운로드됨"}
                </p>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {order.status === "ESCROW" && left !== null
                      ? `에스크로 종료까지 D-${left}`
                      : order.status === "SETTLED"
                        ? `정산일: ${order.settledAt?.toLocaleDateString("ko-KR") ?? "-"}`
                        : ""}
                  </span>
                  <span className="font-semibold">{formatKRW(order.amount)}</span>
                </div>
              </Link>
              {canDownload && (
                <a href={`/api/orders/${order.id}/download`} className="mt-3 block">
                  <Button variant="outline" size="sm" className="w-full">
                    원본 파일 {order.downloaded ? "다시 열기" : "다운로드"}
                  </Button>
                </a>
              )}
              {order.status === "ESCROW" && (
                <>
                  <ApproveOrderButton orderId={order.id} />
                  <DisputeButton orderId={order.id} />
                </>
              )}
              {order.status === "DISPUTED" && order.disputeReason && (
                <p className="mt-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  제기한 이의: {order.disputeReason}
                </p>
              )}
              {order.status === "SETTLED" &&
                (order.review ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    내 리뷰:{" "}
                    <span aria-label={`5점 만점에 ${order.review.rating}점`}>
                      <span aria-hidden="true">
                        {"★".repeat(order.review.rating)}
                        {"☆".repeat(5 - order.review.rating)}
                      </span>
                    </span>
                  </p>
                ) : (
                  <ReviewForm orderId={order.id} />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
