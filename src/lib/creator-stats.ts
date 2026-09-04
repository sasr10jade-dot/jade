import { prisma } from "@/lib/prisma";
import { lastNDays, dayKey, type DailyPoint } from "@/components/mini-bar-chart";

const TREND_DAYS = 14;

// Studio 상단 통계 대시보드용 — Track.playCount는 누적값이라 추이를 못 그리므로
// PlayEvent 로그(최근 14일분만 쌓임, 그 이전은 총계에만 반영)로 일별 재생 추이를 만들고,
// 매출 추이는 Order.netAmount(정산액 기준, 실제 이의제기/환불 전 상태 포함)를 구매일 기준으로 집계.
export async function getCreatorStats(creatorId: string) {
  const since = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);

  const [trackAgg, totalLikes, playEvents, orders] = await Promise.all([
    prisma.track.aggregate({
      where: { creatorId },
      _sum: { playCount: true },
      _count: { _all: true },
    }),
    prisma.like.count({ where: { track: { creatorId } } }),
    prisma.playEvent.findMany({
      where: { track: { creatorId }, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.order.findMany({
      where: { track: { creatorId }, purchasedAt: { gte: since }, status: { in: ["ESCROW", "SETTLED"] } },
      select: { purchasedAt: true, netAmount: true },
    }),
  ]);

  const days = lastNDays(TREND_DAYS);
  const playsByDay = new Map(days.map((d) => [d, 0]));
  for (const e of playEvents) {
    const k = dayKey(e.createdAt);
    if (playsByDay.has(k)) playsByDay.set(k, (playsByDay.get(k) ?? 0) + 1);
  }
  const revenueByDay = new Map(days.map((d) => [d, 0]));
  for (const o of orders) {
    const k = dayKey(o.purchasedAt);
    if (revenueByDay.has(k)) revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + o.netAmount);
  }

  return {
    totalTracks: trackAgg._count._all,
    totalPlays: trackAgg._sum.playCount ?? 0,
    totalLikes,
    plays: days.map((d) => ({ date: d, value: playsByDay.get(d) ?? 0 })) satisfies DailyPoint[],
    revenue: days.map((d) => ({ date: d, value: revenueByDay.get(d) ?? 0 })) satisfies DailyPoint[],
  };
}
