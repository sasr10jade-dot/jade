/**
 * Fee & Payout Structure — PRD Section 12.
 *
 * Rate table (MVP):
 *  - Exclusive:              20%
 *  - Non-Exclusive:          15%
 *  - Seed creator promo:     10% (first 90 days OR first 5 sales, whichever first)
 *  - Volume tier (v0.2+):    15~18% — not implemented yet, tracked as an open decision
 *    (Section 11 Open Decisions / Section 12 rate table, "P2").
 */

export type LicenseType = "EXCLUSIVE" | "NON_EXCLUSIVE";

export interface FeeInput {
  licenseType: LicenseType;
  amount: number; // KRW, integer won
  isSeedCreator: boolean;
  seedPromoUntil: Date | null;
  creatorSalesCount: number; // total prior confirmed sales for this creator
  now?: Date;
}

export interface FeeResult {
  rate: number; // e.g. 0.20
  feeAmount: number;
  netAmount: number; // amount - feeAmount, split between Creator/Performer per Split
}

const BASE_RATE: Record<LicenseType, number> = {
  EXCLUSIVE: 0.2,
  NON_EXCLUSIVE: 0.15,
};

const SEED_PROMO_RATE = 0.1;
const SEED_PROMO_MAX_SALES = 5;

export function resolveFeeRate(input: Omit<FeeInput, "amount">): number {
  const now = input.now ?? new Date();
  const seedActive =
    input.isSeedCreator &&
    input.creatorSalesCount < SEED_PROMO_MAX_SALES &&
    (!input.seedPromoUntil || now <= input.seedPromoUntil);

  if (seedActive) return SEED_PROMO_RATE;
  return BASE_RATE[input.licenseType];
}

/** Computes platform fee + net (seller) amount for one order. Rounds to whole won. */
export function calculateFee(input: FeeInput): FeeResult {
  const rate = resolveFeeRate(input);
  const feeAmount = Math.round(input.amount * rate);
  const netAmount = input.amount - feeAmount;
  return { rate, feeAmount, netAmount };
}

/** Splits the seller's net amount between Creator and Performer per their agreed Split. */
export function splitNetAmount(
  netAmount: number,
  creatorShare: number, // e.g. 80 meaning 80%
  performerShare: number
) {
  if (Math.round(creatorShare + performerShare) !== 100) {
    throw new Error(
      `Split shares must sum to 100 (got creator=${creatorShare}, performer=${performerShare})`
    );
  }
  // Compute one share and take the other as the remainder so the two amounts
  // always sum exactly to netAmount, regardless of rounding.
  const creatorAmount = Math.round((netAmount * creatorShare) / 100);
  const performerAmount = netAmount - creatorAmount;
  return { creatorAmount, performerAmount };
}

/**
 * Refund handling — Section 12 "환불 시 수수료 처리".
 *  - Original file not downloaded: 100% refund, platform fee fully refunded, seller payout voided.
 *  - Downloaded: 50% refund, platform fee only half-refunded (platform absorbs PG cost on the rest).
 */
export function calculateRefund(order: {
  amount: number;
  feeAmount: number;
  downloaded: boolean;
}) {
  if (!order.downloaded) {
    return { refundAmount: order.amount, feeRefunded: order.feeAmount };
  }
  const refundAmount = Math.round(order.amount * 0.5);
  const feeRefunded = Math.round(order.feeAmount * 0.5);
  return { refundAmount, feeRefunded };
}
