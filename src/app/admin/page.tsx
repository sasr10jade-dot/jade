import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { settleExpiredEscrows } from "@/lib/settlement";

export default async function AdminDashboardPage() {
  await settleExpiredEscrows();
  const [userCount, trackCount, stalledSplits, disputedOrders, orders] = await Promise.all([
    prisma.user.count(),
    prisma.track.count({ where: { removedByAdmin: false } }),
    prisma.split.count({ where: { status: "STALLED" } }),
    prisma.order.count({ where: { status: "DISPUTED" } }),
    prisma.order.findMany({ select: { amount: true, feeAmount: true, status: true } }),
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
  ];

  return (
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
  );
}
