import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { SplitResolveForm } from "./split-resolve-form";
import { OrderResolveActions } from "./order-resolve-actions";
import { OfferResolveForm } from "./offer-resolve-form";

export default async function AdminDisputesPage() {
  const [stalledSplits, disputedOrders, stalledOffers] = await Promise.all([
    prisma.split.findMany({
      where: { status: "STALLED" },
      include: {
        track: { select: { title: true } },
        performer: { select: { name: true } },
        log: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      },
    }),
    prisma.order.findMany({
      where: { status: "DISPUTED" },
      include: {
        track: { select: { title: true } },
        buyer: { select: { name: true, email: true } },
      },
    }),
    prisma.priceOffer.findMany({
      where: { status: "STALLED" },
      include: {
        track: { select: { title: true } },
        license: { select: { type: true } },
        buyer: { select: { name: true } },
        log: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold">보류된 Split</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          역제안 3회 초과로 보류된 협의 — 관리자가 최종 분배율을 확정합니다
        </p>
        {stalledSplits.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">보류된 Split이 없습니다.</p>
        )}
        <div className="mt-4 space-y-4">
          {stalledSplits.map((split) => (
            <div key={split.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{split.track.title}</span>
                <span className="text-xs text-muted-foreground">상대방: {split.performer.name}</span>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {split.log.map((entry) => (
                  <li key={entry.id}>
                    · {entry.actor.name} {entry.action}: {entry.creatorShare} / {entry.performerShare}
                  </li>
                ))}
              </ul>
              <SplitResolveForm
                splitId={split.id}
                defaultCreatorShare={Math.round(split.creatorShare)}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">이의 제기된 주문</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          관리자가 정산 진행 또는 환불 처리를 결정합니다
        </p>
        {disputedOrders.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">이의 제기된 주문이 없습니다.</p>
        )}
        <div className="mt-4 space-y-2">
          {disputedOrders.map((order) => (
            <div key={order.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{order.track.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {order.buyer.name} · {formatKRW(order.amount)} ·{" "}
                  {order.downloaded ? "원본 다운로드됨 (부분 환불 대상)" : "미다운로드 (전액 환불 대상)"}
                </span>
                {order.disputeReason && (
                  <p className="mt-1 text-xs text-muted-foreground">사유: {order.disputeReason}</p>
                )}
              </div>
              <OrderResolveActions orderId={order.id} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">보류된 가격 제안</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          역제안 3회 초과로 보류된 흥정 — 관리자가 최종 금액을 확정하거나 거절 처리합니다
        </p>
        {stalledOffers.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">보류된 가격 제안이 없습니다.</p>
        )}
        <div className="mt-4 space-y-4">
          {stalledOffers.map((offer) => (
            <div key={offer.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {offer.track.title} · {offer.license.type}
                </span>
                <span className="text-xs text-muted-foreground">구매자: {offer.buyer.name}</span>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {offer.log.map((entry) => (
                  <li key={entry.id}>
                    · {entry.actor.name} {entry.action}: {formatKRW(entry.amount)}
                  </li>
                ))}
              </ul>
              <OfferResolveForm offerId={offer.id} defaultAmount={offer.amount} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
