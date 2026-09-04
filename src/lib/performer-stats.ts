import { prisma } from "@/lib/prisma";
import { lastNDays, dayKey, type DailyPoint } from "@/components/mini-bar-chart";

const TREND_DAYS = 14;

// Creator에게 Studio 통계가 있듯, Performer에게도 자기 활동/수익 현황을 보여주기 위한
// 대응 통계. 수익은 releaseEscrow()가 Split 합의 비율대로 Performer에게 적립하는
// CashTransaction(type: ESCROW_RELEASE)을 근거로 집계 — Order/Split을 거치지 않고
// 실제로 돈이 들어온 시점 기준이라 "받은 정산액"과 정확히 일치한다.
export async function getPerformerStats(performerId: string) {
  const since = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);

  const [totalGuides, selectedGuides, earningsAgg, recentGuides, recentEarnings] = await Promise.all([
    prisma.guide.count({ where: { performerId } }),
    prisma.guide.count({ where: { performerId, status: "SELECTED" } }),
    prisma.cashTransaction.aggregate({
      where: { userId: performerId, type: "ESCROW_RELEASE" },
      _sum: { amount: true },
    }),
    prisma.guide.findMany({ where: { performerId, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.cashTransaction.findMany({
      where: { userId: performerId, type: "ESCROW_RELEASE", createdAt: { gte: since } },
      select: { createdAt: true, amount: true },
    }),
  ]);

  const days = lastNDays(TREND_DAYS);
  const submissionsByDay = new Map(days.map((d) => [d, 0]));
  for (const g of recentGuides) {
    const k = dayKey(g.createdAt);
    if (submissionsByDay.has(k)) submissionsByDay.set(k, (submissionsByDay.get(k) ?? 0) + 1);
  }
  const earningsByDay = new Map(days.map((d) => [d, 0]));
  for (const t of recentEarnings) {
    const k = dayKey(t.createdAt);
    if (earningsByDay.has(k)) earningsByDay.set(k, (earningsByDay.get(k) ?? 0) + t.amount);
  }

  return {
    totalGuides,
    selectedGuides,
    totalEarnings: earningsAgg._sum.amount ?? 0,
    submissions: days.map((d) => ({ date: d, value: submissionsByDay.get(d) ?? 0 })) satisfies DailyPoint[],
    earnings: days.map((d) => ({ date: d, value: earningsByDay.get(d) ?? 0 })) satisfies DailyPoint[],
  };
}
