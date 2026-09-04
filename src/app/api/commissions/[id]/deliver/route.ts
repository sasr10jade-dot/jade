import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LicenseType } from "@/lib/fee";
import { createOrderAtPrice } from "@/lib/orders";

const DeliverSchema = z.object({
  title: z.string().min(1),
  fileUrl: z.string().min(1),
  fileSize: z.number().int().positive(),
  thumbnailUrl: z.string().optional(),
  bpm: z.number().int().positive().optional(),
  key: z.string().optional(),
  lyrics: z.string().optional(),
});

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
  const parsed = DeliverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const request = await prisma.commissionRequest.findUnique({
    where: { id },
    include: {
      offers: { where: { status: "SELECTED" } },
      buyer: { select: { id: true } },
    },
  });
  if (!request) {
    return NextResponse.json({ error: "의뢰를 찾을 수 없습니다" }, { status: 404 });
  }
  if (request.status !== "MATCHED") {
    return NextResponse.json({ error: "납품 가능한 상태가 아닙니다" }, { status: 409 });
  }
  const selectedOffer = request.offers[0];
  if (!selectedOffer || selectedOffer.creatorId !== session.user.id) {
    return NextResponse.json({ error: "이 의뢰에 선정된 크리에이터만 납품할 수 있습니다" }, { status: 403 });
  }

  const creator = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true, isSeedCreator: true, seedPromoUntil: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    const track = await tx.track.create({
      data: {
        title: parsed.data.title,
        bpm: parsed.data.bpm,
        bpmAuto: !parsed.data.bpm,
        key: parsed.data.key,
        keyAuto: !parsed.data.key,
        genre: request.genre,
        mood: request.mood,
        lyrics: parsed.data.lyrics,
        fileUrl: parsed.data.fileUrl,
        fileSize: parsed.data.fileSize,
        thumbnailUrl: parsed.data.thumbnailUrl,
        status: "LISTED",
        creatorId: session.user.id,
        commissionRequestId: request.id,
        licenses: {
          create: [{ type: request.licenseType, price: selectedOffer.price }],
        },
      },
      include: { licenses: true },
    });

    const order = await createOrderAtPrice(tx, {
      trackId: track.id,
      trackTitle: track.title,
      licenseId: track.licenses[0].id,
      licenseType: request.licenseType as LicenseType,
      buyerId: request.buyerId,
      price: selectedOffer.price,
      creatorId: session.user.id,
      isSeedCreator: creator.isSeedCreator,
      seedPromoUntil: creator.seedPromoUntil,
    });

    await tx.commissionRequest.update({ where: { id }, data: { status: "DELIVERED" } });
    await tx.notification.create({
      data: {
        userId: request.buyerId,
        fromUserId: session.user.id,
        type: "COMMISSION_DELIVERED",
        message: `"${request.title}" 의뢰가 납품되었습니다. 에스크로 결제가 시작되었습니다`,
      },
    });

    return { track, order };
  });

  return NextResponse.json(result, { status: 201 });
}
