import { prisma } from "@/lib/prisma";

const DEADLINE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * settleExpiredEscrows()와 동일한 이유로 실제 스케줄러 없이 lazy 실행 — 의뢰 목록을
 * 보여주는 페이지 진입 시마다 마감일이 지난 OPEN 의뢰를 EXPIRED로 전환한다.
 */
export async function expireOverdueCommissions() {
  await prisma.commissionRequest.updateMany({
    where: { status: "OPEN", deadline: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });
}

/**
 * 마감 24시간 이내로 다가온 OPEN 의뢰의 구매자에게 알림 — deadlineNotifiedAt으로
 * 한 번만 보내도록 막는다(페이지 진입마다 다시 호출되므로 플래그 없으면 중복 발송).
 */
export async function notifyUpcomingCommissionDeadlines() {
  const now = new Date();
  const soon = await prisma.commissionRequest.findMany({
    where: {
      status: "OPEN",
      deadlineNotifiedAt: null,
      deadline: { gt: now, lte: new Date(now.getTime() + DEADLINE_SOON_WINDOW_MS) },
    },
    select: { id: true, title: true, buyerId: true },
  });

  for (const r of soon) {
    await prisma.$transaction([
      prisma.commissionRequest.update({ where: { id: r.id }, data: { deadlineNotifiedAt: now } }),
      prisma.notification.create({
        data: {
          userId: r.buyerId,
          type: "COMMISSION_DEADLINE_SOON",
          message: `"${r.title}" 의뢰 마감이 24시간 이내로 다가왔습니다. 지원자를 확인해보세요.`,
        },
      }),
    ]);
  }
}
