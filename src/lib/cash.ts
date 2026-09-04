import type { Prisma, CashTransactionType } from "@prisma/client";

// VOICE Cash 원장(ledger) 헬퍼 — 반드시 prisma.$transaction(tx => ...) 콜백 안에서
// tx(트랜잭션 클라이언트)와 함께 호출할 것. balanceAfter는 매 트랜잭션마다 스냅샷으로
// 남겨 감사 추적이 가능하게 한다. "코인"/"화폐"라 부르지 않고 항상 "캐시"로 지칭.
type TxClient = Prisma.TransactionClient;

export async function creditCash(
  tx: TxClient,
  userId: string,
  amount: number,
  type: CashTransactionType,
  opts?: { orderId?: string; memo?: string }
) {
  if (amount <= 0) throw new Error("creditCash amount must be positive");
  const user = await tx.user.update({
    where: { id: userId },
    data: { cashBalance: { increment: amount } },
  });
  await tx.cashTransaction.create({
    data: {
      userId,
      type,
      amount,
      balanceAfter: user.cashBalance,
      orderId: opts?.orderId,
      memo: opts?.memo,
    },
  });
  return user.cashBalance;
}

export async function debitCash(
  tx: TxClient,
  userId: string,
  amount: number,
  type: CashTransactionType,
  opts?: { orderId?: string; memo?: string }
) {
  if (amount <= 0) throw new Error("debitCash amount must be positive");
  const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { cashBalance: true } });
  if (before.cashBalance < amount) {
    throw new Error("INSUFFICIENT_CASH");
  }
  const user = await tx.user.update({
    where: { id: userId },
    data: { cashBalance: { decrement: amount } },
  });
  await tx.cashTransaction.create({
    data: {
      userId,
      type,
      amount: -amount,
      balanceAfter: user.cashBalance,
      orderId: opts?.orderId,
      memo: opts?.memo,
    },
  });
  return user.cashBalance;
}

// 정산 신청 최소 금액 — Section 12 정책.
export const MIN_SETTLEMENT_AMOUNT = 50000;
// 사업소득 원천징수율 — 정산 신청 시 자동 계산.
export const WITHHOLDING_RATE = 0.033;
