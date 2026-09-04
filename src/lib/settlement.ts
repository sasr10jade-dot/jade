import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { creditCash } from "@/lib/cash";
import { splitNetAmount } from "@/lib/fee";

type TxClient = Prisma.TransactionClient;

/**
 * 에스크로 해제 — 구매 승인(수동 또는 7일 자동)의 실제 실행부. netAmount를 Split
 * 합의 비율대로(없으면 Creator 100%) VOICE Cash로 적립하고 주문을 SETTLED로 전환.
 * DISPUTED 주문은 status !== "ESCROW" 가드에 걸려 여기서 처리되지 않는다.
 */
export async function releaseEscrow(tx: TxClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { track: { include: { split: true } } },
  });
  if (order.status !== "ESCROW") return;

  const { track } = order;
  const split = track.split;

  if (split && split.status === "AGREED") {
    const { creatorAmount, performerAmount } = splitNetAmount(
      order.netAmount,
      split.creatorShare,
      split.performerShare
    );
    await creditCash(tx, track.creatorId, creatorAmount, "ESCROW_RELEASE", {
      orderId,
      memo: `${track.title} 판매 정산 (Creator ${split.creatorShare}%)`,
    });
    if (performerAmount > 0) {
      await creditCash(tx, split.performerId, performerAmount, "ESCROW_RELEASE", {
        orderId,
        memo: `${track.title} 판매 정산 (Performer ${split.performerShare}%)`,
      });
    }
  } else {
    // 합의된 Split이 없으면(단독 크리에이터 등) 전액 Creator에게.
    await creditCash(tx, track.creatorId, order.netAmount, "ESCROW_RELEASE", {
      orderId,
      memo: `${track.title} 판매 정산`,
    });
  }

  await tx.order.update({
    where: { id: orderId },
    data: { status: "SETTLED", settledAt: new Date() },
  });
}

/**
 * Section 7/12: 구매 후 7일 이내 이의 없으면 자동 정산. No real cron/scheduler in this
 * dev environment, so this runs lazily — called from the pages that display order/
 * settlement state (buyer's /orders, creator's /studio, admin dashboard) right before
 * querying, so any order whose escrow window has passed is settled before being read.
 * A DISPUTED order is excluded by the `status: "ESCROW"` filter, so raising a dispute
 * within the window correctly pre-empts auto-settlement.
 */
export async function settleExpiredEscrows() {
  const expired = await prisma.order.findMany({
    where: { status: "ESCROW", escrowEndsAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const { id } of expired) {
    await prisma.$transaction((tx) => releaseEscrow(tx, id));
  }
}
