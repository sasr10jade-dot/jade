import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { MIN_SETTLEMENT_AMOUNT, isDepositBankConfigured } from "@/lib/cash";
import { settleExpiredEscrows } from "@/lib/settlement";
import { DepositRequestForm, SettlementRequestButton } from "./wallet-actions";

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

const DEPOSIT_STATUS_LABEL: Record<string, string> = {
  PENDING: "확인 대기",
  CONFIRMED: "입금 확인 완료",
  REJECTED: "거절됨",
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

  const [user, transactions, settlementRequests, depositRequests] = await Promise.all([
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
    prisma.cashTopupRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  const bankConfigured = isDepositBankConfigured();

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

      <h2 className="mt-8 text-lg font-semibold">충전 (무통장 입금)</h2>
      {bankConfigured ? (
        <>
          <p className="text-sm text-muted-foreground">
            아래 계좌로 입금 후, 실제 입금하신 입금자명과 금액을 정확히 입력해 신청해주세요.
            관리자 확인 후 캐시가 적립됩니다.
          </p>
          <Card className="mt-3">
            <CardContent className="text-sm">
              <p>
                {process.env.DEPOSIT_BANK_NAME} {process.env.DEPOSIT_BANK_ACCOUNT}
              </p>
              <p className="text-muted-foreground">예금주: {process.env.DEPOSIT_BANK_HOLDER}</p>
            </CardContent>
          </Card>
          <div className="mt-3">
            <DepositRequestForm />
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          입금 계좌 정보가 아직 등록되지 않았습니다. 관리자에게 문의해주세요.
        </p>
      )}

      {depositRequests.length > 0 && (
        <div className="mt-4 space-y-2">
          {depositRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <span className="font-medium">{formatKRW(r.amount)}</span>
                <span className="ml-2 text-xs text-muted-foreground">입금자명: {r.depositorName}</span>
                {r.status === "REJECTED" && r.rejectedReason && (
                  <div className="text-xs text-muted-foreground">사유: {r.rejectedReason}</div>
                )}
              </div>
              <Badge variant={r.status === "REJECTED" ? "destructive" : "outline"}>
                {DEPOSIT_STATUS_LABEL[r.status] ?? r.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

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
