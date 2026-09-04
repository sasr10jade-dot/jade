import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateOfferSchema = z.object({
  price: z.number().int().positive(),
  message: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Creator만 의뢰에 지원할 수 있습니다" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = CreateOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const request = await prisma.commissionRequest.findUnique({ where: { id } });
  if (!request) {
    return NextResponse.json({ error: "의뢰를 찾을 수 없습니다" }, { status: 404 });
  }
  if (request.status !== "OPEN") {
    return NextResponse.json({ error: "지원을 받고 있지 않은 의뢰입니다" }, { status: 409 });
  }
  if (request.buyerId === session.user.id) {
    return NextResponse.json({ error: "본인이 등록한 의뢰에는 지원할 수 없습니다" }, { status: 400 });
  }

  const existing = await prisma.commissionOffer.findUnique({
    where: { requestId_creatorId: { requestId: id, creatorId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 이 의뢰에 지원했습니다" }, { status: 409 });
  }

  const offer = await prisma.$transaction(async (tx) => {
    const created = await tx.commissionOffer.create({
      data: {
        requestId: id,
        creatorId: session.user.id,
        price: parsed.data.price,
        message: parsed.data.message,
      },
    });
    await tx.notification.create({
      data: {
        userId: request.buyerId,
        fromUserId: session.user.id,
        type: "COMMISSION_OFFER_RECEIVED",
        message: `"${request.title}" 의뢰에 새 지원이 도착했습니다 (${parsed.data.price.toLocaleString()}원)`,
      },
    });
    return created;
  });

  return NextResponse.json(offer, { status: 201 });
}
