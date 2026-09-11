import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { creditCash } from "@/lib/cash";

// 관리자가 실제 계좌 입금을 확인한 후에만 캐시가 적립된다 — 적립+상태변경+감사로그를
// 하나의 트랜잭션으로 원자 처리(정산 지급 라우트보다 강한 보장 — 실제 캐시 발행이 걸려있음).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const depositRequest = await prisma.cashTopupRequest.findUnique({ where: { id } });
  if (!depositRequest) {
    return NextResponse.json({ error: "입금 신청을 찾을 수 없습니다" }, { status: 404 });
  }
  if (depositRequest.status !== "PENDING") {
    return NextResponse.json({ error: "이미 처리된 요청입니다" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await creditCash(tx, depositRequest.userId, depositRequest.amount, "TOPUP", {
      memo: `무통장 입금 확인 (입금자: ${depositRequest.depositorName})`,
    });
    await tx.cashTopupRequest.update({
      where: { id },
      data: { status: "CONFIRMED", processedAt: new Date() },
    });
    await logAdminAction(tx, {
      actorId: session!.user.id,
      action: "DEPOSIT_CONFIRMED",
      targetType: "DEPOSIT",
      targetId: id,
      metadata: {
        amount: depositRequest.amount,
        userId: depositRequest.userId,
        depositorName: depositRequest.depositorName,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
