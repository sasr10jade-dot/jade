import { prisma } from "@/lib/prisma";

const STALE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000; // 만료 1일 전에 알림
const ACTIVE_STATUSES = ["PROPOSED", "COUNTERED"] as const;

/**
 * 7일간 응답 없이 방치된 가격 제안을 EXPIRED로 전환 — Commission/Order의 마감·에스크로
 * 리마인더와 동일한 이유로 실제 스케줄러 없이 lazy 실행.
 */
export async function expireStalePriceOffers() {
  await prisma.priceOffer.updateMany({
    where: { status: { in: [...ACTIVE_STATUSES] }, updatedAt: { lte: new Date(Date.now() - STALE_WINDOW_MS) } },
    data: { status: "EXPIRED" },
  });
}

/**
 * 만료 24시간 전, 응답할 차례인 쪽(lastActorId가 아닌 쪽)에게 1회 알림.
 * expiryReminderSentAt으로 중복 발송 방지.
 */
export async function notifyUpcomingPriceOfferExpirations() {
  const now = new Date();
  const remindCutoff = new Date(now.getTime() - (STALE_WINDOW_MS - REMINDER_LEAD_MS));
  const stale = await prisma.priceOffer.findMany({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      expiryReminderSentAt: null,
      updatedAt: { lte: remindCutoff },
    },
    include: { track: { select: { title: true, creatorId: true } } },
  });

  for (const offer of stale) {
    const waitingPartyId = offer.lastActorId === offer.buyerId ? offer.track.creatorId : offer.buyerId;
    await prisma.$transaction([
      prisma.priceOffer.update({ where: { id: offer.id }, data: { expiryReminderSentAt: now } }),
      prisma.notification.create({
        data: {
          userId: waitingPartyId,
          type: "OFFER_EXPIRING_SOON",
          message: `"${offer.track.title}" 가격 제안이 24시간 이내에 만료됩니다. 응답해주세요.`,
        },
      }),
    ]);
  }
}
