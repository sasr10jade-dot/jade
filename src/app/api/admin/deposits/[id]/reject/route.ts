import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const RejectSchema = z.object({ reason: z.string().trim().max(200).optional() });

// 캐시 변동 없음 — 상태만 REJECTED로 바꾸고 사유를 기록한다. 신청 금액이 실제 입금액과
// 다르더라도 관리자가 금액을 고쳐서 확인 처리하는 기능은 두지 않는다(원장 신뢰성을 위해
// creditCash 금액은 항상 신청 금액과 일치해야 함) — 거절 후 사용자가 다시 신청하도록 안내.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = RejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 입력입니다" }, { status: 400 });
  }

  const depositRequest = await prisma.cashTopupRequest.findUnique({ where: { id } });
  if (!depositRequest) {
    return NextResponse.json({ error: "입금 신청을 찾을 수 없습니다" }, { status: 404 });
  }
  if (depositRequest.status !== "PENDING") {
    return NextResponse.json({ error: "이미 처리된 요청입니다" }, { status: 409 });
  }

  const updated = await prisma.cashTopupRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      processedAt: new Date(),
      rejectedReason: parsed.data.reason || null,
    },
  });
  await logAdminAction(prisma, {
    actorId: session!.user.id,
    action: "DEPOSIT_REJECTED",
    targetType: "DEPOSIT",
    targetId: id,
    metadata: {
      amount: depositRequest.amount,
      userId: depositRequest.userId,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json(updated);
}
