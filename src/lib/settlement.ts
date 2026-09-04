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

const REVIEW_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * 구매자가 7일 에스크로 검수 기간을 그냥 흘려보내고 있을 때 한 번 알려줌 — 곡 의뢰
 * 마감 임박 알림(notifyUpcomingCommissionDeadlines)과 동일한 lazy-실행 + 1회성 발송
 * 패턴. escrowReminderSentAt으로 페이지 재방문마다 중복 발송되지 않게 막는다.
 */
export async function notifyUpcomingEscrowReviews() {
  const now = new Date();
  const soon = await prisma.order.findMany({
    where: {
      status: "ESCROW",
      escrowReminderSentAt: null,
      escrowEndsAt: { gt: now, lte: new Date(now.getTime() + REVIEW_REMINDER_WINDOW_MS) },
    },
    include: { track: { select: { title: true } } },
  });

  for (const order of soon) {
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { escrowReminderSentAt: now } }),
      prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: "ESCROW_REVIEW_REMINDER",
          message: `"${order.track.title}" 구매 건의 에스크로 검수 기간이 24시간 이내에 종료됩니다. 문제가 없다면 그대로 두면 자동 정산되고, 이의가 있다면 지금 제기해주세요.`,
        },
      }),
    ]);
  }
}
