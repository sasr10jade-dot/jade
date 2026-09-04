import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// 구매 완료(SETTLED) 주문에 대해 구매자가 남기는 평점/후기 — 처음 보는 크리에이터를
// 신뢰할 근거가 "시드 크리에이터" 뱃지뿐이었던 걸 보완. 주문 1건당 리뷰 1개.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { orderId, rating, comment } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { track: { select: { id: true, creatorId: true, title: true } }, review: true },
  });
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "본인 주문에만 리뷰를 남길 수 있습니다" }, { status: 403 });
  }
  if (order.status !== "SETTLED") {
    return NextResponse.json({ error: "정산 완료된 구매에만 리뷰를 남길 수 있습니다" }, { status: 409 });
  }
  if (order.review) {
    return NextResponse.json({ error: "이미 리뷰를 남긴 주문입니다" }, { status: 409 });
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        orderId,
        trackId: order.track.id,
        authorId: session.user.id,
        targetId: order.track.creatorId,
        rating,
        comment: comment || null,
      },
    });
    await tx.notification.create({
      data: {
        userId: order.track.creatorId,
        fromUserId: session.user.id,
        type: "REVIEW_RECEIVED",
        message: `${order.track.title}에 리뷰가 달렸습니다 (${"★".repeat(rating)}${"☆".repeat(5 - rating)})`,
      },
    });
    return created;
  });

  return NextResponse.json(review, { status: 201 });
}
