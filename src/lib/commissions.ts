import { prisma } from "@/lib/prisma";

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
