import { prisma } from "@/lib/prisma";
import { lastNDays, dayKey, type DailyPoint } from "@/components/mini-bar-chart";

const TREND_DAYS = 14;

export type RoleBreakdown = { role: string; count: number };
export type GenreCount = { genre: string; count: number };

// Admin 대시보드 상단 카드는 이미 GMV/수수료/에스크로 총계를 보여주므로, 여기서는
// 그걸로 안 잡히는 "구성/추이" 관점 — 역할별 유저 분포, 인기 장르, 신규가입·GMV 14일 추이.
export async function getPlatformStats() {
  const since = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);

  const [roleGroups, genreGroups, newUsers, recentOrders] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.track.groupBy({
      by: ["genre"],
      where: { removedByAdmin: false, removedByCreator: false, genre: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { genre: "desc" } },
      take: 5,
    }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.order.findMany({ where: { purchasedAt: { gte: since } }, select: { purchasedAt: true, amount: true } }),
  ]);

  const roleBreakdown: RoleBreakdown[] = roleGroups
    .map((g) => ({ role: g.role, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
  const topGenres: GenreCount[] = genreGroups.map((g) => ({ genre: g.genre!, count: g._count._all }));

  const days = lastNDays(TREND_DAYS);
  const signupsByDay = new Map(days.map((d) => [d, 0]));
  for (const u of newUsers) {
    const k = dayKey(u.createdAt);
    if (signupsByDay.has(k)) signupsByDay.set(k, (signupsByDay.get(k) ?? 0) + 1);
  }
  const gmvByDay = new Map(days.map((d) => [d, 0]));
  for (const o of recentOrders) {
    const k = dayKey(o.purchasedAt);
    if (gmvByDay.has(k)) gmvByDay.set(k, (gmvByDay.get(k) ?? 0) + o.amount);
  }

  return {
    roleBreakdown,
    topGenres,
    signups: days.map((d) => ({ date: d, value: signupsByDay.get(d) ?? 0 })) satisfies DailyPoint[],
    gmvTrend: days.map((d) => ({ date: d, value: gmvByDay.get(d) ?? 0 })) satisfies DailyPoint[],
  };
}

// 어드민 사이드바 네비 뱃지 — 각 카운트는 해당 페이지가 실제로 보여주는 "처리 대상" 건수와
// 정확히 일치시킴 (예: 분쟁/보류는 STALLED Split + DISPUTED Order + STALLED PriceOffer 3종 전부).
export async function getAdminBadgeCounts() {
  const [stalledSplits, disputedOrders, stalledOffers, pendingSettlements, openTickets, openReports] =
    await Promise.all([
      prisma.split.count({ where: { status: "STALLED" } }),
      prisma.order.count({ where: { status: "DISPUTED" } }),
      prisma.priceOffer.count({ where: { status: "STALLED" } }),
      prisma.settlementRequest.count({ where: { status: "PENDING" } }),
      prisma.supportTicket.count({ where: { status: "OPEN" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
    ]);

  return {
    disputes: stalledSplits + disputedOrders + stalledOffers,
    settlements: pendingSettlements,
    support: openTickets,
    reports: openReports,
  };
}
