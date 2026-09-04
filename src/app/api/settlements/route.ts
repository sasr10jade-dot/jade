import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { debitCash, MIN_SETTLEMENT_AMOUNT, WITHHOLDING_RATE } from "@/lib/cash";

// 판매자(Creator/Performer)의 "정산 신청" — 보유 캐시 전액을 즉시 잔액에서 차감(예약)하고
// PENDING 요청을 만든다. 실제 원화 송금은 관리자가 /admin/settlements에서 처리(모의).
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.kycVerified) {
    return NextResponse.json(
      { error: "정산 신청 전 KYC 확인이 필요합니다. 관리자에게 문의해주세요" },
      { status: 403 }
    );
  }
  if (user.cashBalance < MIN_SETTLEMENT_AMOUNT) {
    return NextResponse.json(
      { error: `최소 ${MIN_SETTLEMENT_AMOUNT.toLocaleString()} 캐시부터 정산 신청이 가능합니다` },
      { status: 400 }
    );
  }

  const amount = user.cashBalance;
  const withholding = Math.round(amount * WITHHOLDING_RATE);
  const payoutAmount = amount - withholding;

  const request = await prisma.$transaction(async (tx) => {
    await debitCash(tx, session.user.id, amount, "SETTLEMENT_PAYOUT", {
      memo: "정산 신청 (지급 대기)",
    });
    return tx.settlementRequest.create({
      data: { userId: session.user.id, amount, withholding, payoutAmount },
    });
  });

  return NextResponse.json(request, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const requests = await prisma.settlementRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { requestedAt: "desc" },
  });
  return NextResponse.json(requests);
}
