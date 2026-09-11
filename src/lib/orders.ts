import type { Prisma } from "@prisma/client";
import { calculateFee, type LicenseType } from "@/lib/fee";
import { debitCash } from "@/lib/cash";

const ESCROW_DAYS = 7;

// 정가 구매(POST /api/orders)와 가격 제안 수락(POST /api/offers/[id]/respond, ACCEPT) 양쪽에서
// 공유 — 유일한 차이는 결제 금액(정가 vs 협의된 금액)뿐, 수수료 계산·에스크로 로직은 동일.
// 잔액 부족 시 debitCash가 "INSUFFICIENT_CASH"를 던진다 — 호출자가 처리(무통장 입금 안내).
export async function createOrderAtPrice(
  tx: Prisma.TransactionClient,
  params: {
    trackId: string;
    trackTitle: string;
    licenseId: string;
    licenseType: LicenseType;
    buyerId: string;
    price: number;
    creatorId: string;
    isSeedCreator: boolean;
    seedPromoUntil: Date | null;
  }
) {
  const creatorSalesCount = await tx.order.count({
    where: { track: { creatorId: params.creatorId }, status: { in: ["ESCROW", "SETTLED"] } },
  });

  const fee = calculateFee({
    licenseType: params.licenseType,
    amount: params.price,
    isSeedCreator: params.isSeedCreator,
    seedPromoUntil: params.seedPromoUntil,
    creatorSalesCount,
  });

  const created = await tx.order.create({
    data: {
      trackId: params.trackId,
      licenseId: params.licenseId,
      buyerId: params.buyerId,
      amount: params.price,
      feeRate: fee.rate,
      feeAmount: fee.feeAmount,
      netAmount: fee.netAmount,
      status: "ESCROW",
      escrowEndsAt: new Date(Date.now() + ESCROW_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await debitCash(tx, params.buyerId, params.price, "PURCHASE", {
    orderId: created.id,
    memo: `${params.trackTitle} 구매`,
  });

  return created;
}
