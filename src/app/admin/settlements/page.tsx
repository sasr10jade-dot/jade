import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { SettlementPayButton } from "./settlement-pay-button";

export default async function AdminSettlementsPage() {
  const [pending, paid] = await Promise.all([
    prisma.settlementRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { user: { select: { name: true, email: true, kycVerified: true } } },
    }),
    prisma.settlementRequest.findMany({
      where: { status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold">정산 대기</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          출금 신청 목록 — 실제 은행 송금 후 &quot;지급 완료 처리&quot;를 눌러 기록합니다
        </p>
        {pending.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">대기 중인 정산 신청이 없습니다.</p>
        )}
        <div className="mt-4 space-y-2">
          {pending.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{s.user.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{s.user.email}</span>
                {!s.user.kycVerified && (
                  <span className="ml-2 text-xs font-medium text-destructive">KYC 미인증</span>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  신청 {formatKRW(s.amount)} · 원천징수 {formatKRW(s.withholding)} · 지급액{" "}
                  <span className="font-semibold text-foreground">{formatKRW(s.payoutAmount)}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  신청일 {s.requestedAt.toLocaleDateString("ko-KR")}
                </div>
              </div>
              <SettlementPayButton settlementId={s.id} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">최근 지급 완료</h2>
        {paid.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">지급 완료된 정산이 없습니다.</p>
        )}
        <div className="mt-4 space-y-2">
          {paid.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{s.user.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{s.user.email}</span>
                <div className="mt-1 text-xs text-muted-foreground">
                  지급액 {formatKRW(s.payoutAmount)} ·{" "}
                  {s.paidAt?.toLocaleDateString("ko-KR") ?? "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
