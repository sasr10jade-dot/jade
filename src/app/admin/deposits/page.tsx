import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { DepositRequestRow } from "./deposit-request-row";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "입금 확인 완료",
  REJECTED: "거절됨",
};

export default async function AdminDepositsPage() {
  const [pending, processed] = await Promise.all([
    prisma.cashTopupRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.cashTopupRequest.findMany({
      where: { status: { in: ["CONFIRMED", "REJECTED"] } },
      orderBy: { processedAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div>
      <h2 className="text-lg font-semibold">입금 확인</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        무통장 입금 신청 — 실제 계좌에서 입금자명·금액을 대조 확인한 후 처리해주세요
      </p>

      <h3 className="mt-6 text-sm font-semibold text-muted-foreground">확인 대기 ({pending.length})</h3>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">대기 중인 입금 신청이 없습니다.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {pending.map((r) => (
            <DepositRequestRow key={r.id} request={r} />
          ))}
        </div>
      )}

      <h3 className="mt-8 text-sm font-semibold text-muted-foreground">최근 처리 내역</h3>
      {processed.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">처리 내역이 없습니다.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {processed.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{r.user.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{r.user.email}</span>
                <span className="ml-2 text-xs text-muted-foreground">입금자명: {r.depositorName}</span>
              </div>
              <span className="font-medium">{formatKRW(r.amount)}</span>
              <Badge variant={r.status === "CONFIRMED" ? "default" : "destructive"}>
                {STATUS_LABEL[r.status] ?? r.status}
              </Badge>
              {r.status === "REJECTED" && r.rejectedReason && (
                <span className="w-full text-xs text-muted-foreground">사유: {r.rejectedReason}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
