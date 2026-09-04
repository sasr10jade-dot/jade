import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DisputeSchema = z.object({
  reason: z.string().min(1, "이의 제기 사유를 입력해주세요").max(1000),
});

// 구매자가 에스크로 보호 기간(7일) 안에 이의를 제기 — Section 7/12에 명시된 정책이었지만
// 실제로 이 상태(DISPUTED)로 전환하는 경로가 어디에도 없어서 관리자 처리 화면만 있고
// 이의 제기 자체가 불가능했던 걸 채움.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = DisputeSchema.safeParse(body);
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
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "본인 주문에만 이의를 제기할 수 있습니다" }, { status: 403 });
  }
  if (order.status !== "ESCROW") {
    return NextResponse.json(
      { error: "에스크로 보호 기간 중인 주문에만 이의를 제기할 수 있습니다" },
      { status: 409 }
    );
  }

  const { reason } = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id },
      data: { status: "DISPUTED", disputeReason: reason, disputedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: order.track.creatorId,
        fromUserId: session.user.id,
        type: "ORDER_DISPUTED",
        message: `${order.track.title} 주문에 이의가 제기되었습니다: ${reason.slice(0, 80)}`,
      },
    });
    return result;
  });

  return NextResponse.json(updated);
}
