import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { settleExpiredEscrows } from "@/lib/settlement";
import { getPlatformStats } from "@/lib/admin-stats";
import { MiniBarChart } from "@/components/mini-bar-chart";

const ROLE_LABEL: Record<string, string> = {
  CREATOR: "Creator",
  PERFORMER: "Performer",
  BUYER: "Buyer",
  ADMIN: "Admin",
};

export default async function AdminDashboardPage() {
  await settleExpiredEscrows();
  const [userCount, trackCount, stalledSplits, disputedOrders, openTickets, orders, platformStats] = await Promise.all([
    prisma.user.count(),
    prisma.track.count({ where: { removedByAdmin: false, removedByCreator: false } }),
    prisma.split.count({ where: { status: "STALLED" } }),
    prisma.order.count({ where: { status: "DISPUTED" } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.order.findMany({ select: { amount: true, feeAmount: true, status: true } }),
    getPlatformStats(),
  ]);

  const gmv = orders.reduce((sum, o) => sum + o.amount, 0);
  const feeRevenue = orders.reduce((sum, o) => sum + o.feeAmount, 0);
  const escrowGmv = orders.filter((o) => o.status === "ESCROW").reduce((sum, o) => sum + o.amount, 0);
  const settledGmv = orders.filter((o) => o.status === "SETTLED").reduce((sum, o) => sum + o.amount, 0);

  const stats = [
    { label: "전체 유저", value: userCount.toLocaleString() },
    { label: "노출 중인 트랙", value: trackCount.toLocaleString() },
    { label: "총 GMV", value: formatKRW(gmv) },
    { label: "플랫폼 수수료 매출", value: formatKRW(feeRevenue) },
    { label: "에스크로 보관액", value: formatKRW(escrowGmv) },
    { label: "정산 완료액", value: formatKRW(settledGmv) },
    { label: "보류(STALLED) Split", value: String(stalledSplits) },
    { label: "이의 제기 주문", value: String(disputedOrders) },
    { label: "미답변 고객문의", value: String(openTickets) },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-lg font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">역할별 유저 분포</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {platformStats.roleBreakdown.map((r) => (
                <Badge key={r.role} variant="outline">
                  {ROLE_LABEL[r.role] ?? r.role} {r.count.toLocaleString()}명
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">인기 장르 Top 5 (노출 트랙 기준)</p>
            {platformStats.topGenres.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">장르가 입력된 트랙이 없습니다.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {platformStats.topGenres.map((g) => (
                  <Badge key={g.genre} variant="outline">
                    {g.genre} {g.count.toLocaleString()}곡
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">신규 가입 추이 (최근 14일)</p>
            <MiniBarChart points={platformStats.signups} formatValue={(v) => `${v}명`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">GMV 추이 (최근 14일)</p>
            <MiniBarChart points={platformStats.gmvTrend} formatValue={formatKRW} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
