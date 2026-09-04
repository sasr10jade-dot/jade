import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { calculateRefund } from "@/lib/fee";
import { creditCash } from "@/lib/cash";

const ResolveOrderSchema = z.object({
  resolution: z.enum(["SETTLE", "REFUND"]),
});

// 관리자가 DISPUTED 주문에 개입해 정산 진행 또는 환불 처리를 확정한다 (Section 7/12).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = ResolveOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { track: { select: { title: true, creatorId: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }
  if (order.status !== "DISPUTED") {
    return NextResponse.json({ error: "이의 제기(DISPUTED) 상태의 주문만 개입할 수 있습니다" }, { status: 409 });
  }

  if (parsed.data.resolution === "SETTLE") {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: { status: "SETTLED", settledAt: new Date() },
      });
      await tx.notification.createMany({
        data: [order.buyerId, order.track.creatorId].map((userId) => ({
          userId,
          fromUserId: session!.user.id,
          type: "ORDER_DISPUTE_RESOLVED" as const,
          message: `관리자 개입으로 ${order.track.title} 주문이 정산 진행으로 확정되었습니다`,
        })),
      });
      return result;
    });
    return NextResponse.json(updated);
  }

  // REFUND — 원본 다운로드 여부에 따라 전액/부분 환불(Section 12), 에스크로 단계에서
  // 이의 제기된 주문만 여기 도달하므로(POST /api/orders/[id]/dispute가 ESCROW만 허용)
  // 판매자에게는 아직 정산되지 않은 상태 — 구매자 캐시 잔액만 되돌려주면 된다.
  // (이전엔 주문 상태만 바꾸고 실제 캐시 환불이 빠져 있던 버그를 여기서 같이 고침.)
  const refund = calculateRefund(order);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id },
      data: {
        status: order.downloaded ? "REFUNDED_PARTIAL" : "REFUNDED_FULL",
        settledAt: new Date(),
      },
    });
    if (refund.refundAmount > 0) {
      await creditCash(tx, order.buyerId, refund.refundAmount, "REFUND", {
        orderId: order.id,
        memo: `${order.track.title} 환불 (관리자 이의 제기 처리)`,
      });
    }
    await tx.notification.createMany({
      data: [order.buyerId, order.track.creatorId].map((userId) => ({
        userId,
        fromUserId: session!.user.id,
        type: "ORDER_DISPUTE_RESOLVED" as const,
        message: `관리자 개입으로 ${order.track.title} 주문이 환불 처리되었습니다`,
      })),
    });
    return result;
  });
  return NextResponse.json({ ...updated, refundAmount: refund.refundAmount, feeRefunded: refund.feeRefunded });
}
