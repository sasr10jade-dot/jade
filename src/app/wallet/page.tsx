import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { MIN_SETTLEMENT_AMOUNT } from "@/lib/cash";
import { settleExpiredEscrows } from "@/lib/settlement";
import { TopupForm, SettlementRequestButton } from "./wallet-actions";

const TX_LABEL: Record<string, string> = {
  TOPUP: "충전",
  PURCHASE: "구매",
  ESCROW_RELEASE: "판매 정산",
  SETTLEMENT_PAYOUT: "정산 신청 (출금)",
  REFUND: "환불",
};

const SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "지급 대기",
  PAID: "지급 완료",
};

export default async function WalletPage() {
  const session = await auth();
  await settleExpiredEscrows();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <p className="text-sm text-muted-foreground">로그인이 필요합니다.</p>
      </div>
    );
  }

  const [user, transactions, settlementRequests] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.cashTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { order: { select: { track: { select: { title: true } } } } },
    }),
    prisma.settlementRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  const canRequestSettlement =
    user.kycVerified && user.cashBalance >= MIN_SETTLEMENT_AMOUNT;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">지갑</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        VOICE 캐시 잔액 (1 캐시 = 1원, 플랫폼 안에서만 사용)
      </p>

      <Card className="mt-6">
        <CardContent>
          <p className="text-xs text-muted-foreground">보유 캐시</p>
          <p className="mt-1 text-3xl font-bold">{formatKRW(user.cashBalance)}</p>
        </CardContent>
      </Card>

      <h2 className="mt-8 text-lg font-semibold">충전</h2>
      <p className="text-sm text-muted-foreground">
        구매 시 잔액이 부족하면 자동으로 충전되지만, 미리 충전해둘 수도 있습니다
      </p>
      <div className="mt-3">
        <TopupForm />
      </div>

      <h2 className="mt-8 text-lg font-semibold">정산 신청</h2>
      <p className="text-sm text-muted-foreground">
        최소 {formatKRW(MIN_SETTLEMENT_AMOUNT)} 이상, KYC 확인 후 신청 가능 — 사업소득
        3.3% 원천징수 후 원화로 지급됩니다
      </p>
      {!user.kycVerified && (
        <p className="mt-2 text-xs text-muted-foreground">
          KYC 미확인 상태입니다. 관리자에게 문의해주세요.
        </p>
      )}
      <div className="mt-3">
        <SettlementRequestButton eligible={canRequestSettlement} />
      </div>

      {settlementRequests.length > 0 && (
        <div className="mt-4 space-y-2">
          {settlementRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <span className="font-medium">{formatKRW(r.amount)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  원천징수 {formatKRW(r.withholding)} · 실지급 {formatKRW(r.payoutAmount)}
                </span>
              </div>
              <Badge variant="outline">{SETTLEMENT_STATUS_LABEL[r.status] ?? r.status}</Badge>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">거래 내역</h2>
      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">아직 거래 내역이 없습니다.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <span className="font-medium">{TX_LABEL[t.type] ?? t.type}</span>
                {t.order?.track && (
                  <span className="ml-2 text-xs text-muted-foreground">{t.order.track.title}</span>
                )}
                <span className="ml-2 text-xs text-muted-foreground">
                  {t.createdAt.toLocaleDateString("ko-KR")}
                </span>
              </div>
              <span className={t.amount >= 0 ? "font-semibold text-primary" : "font-semibold text-muted-foreground"}>
                {t.amount >= 0 ? "+" : ""}
                {formatKRW(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
