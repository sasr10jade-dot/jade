import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { LicenseType } from "@/lib/fee";
import { createOrderAtPrice } from "@/lib/orders";

const ResolveOfferSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ACCEPT"), amount: z.number().int().positive() }),
  z.object({ action: z.literal("REJECT") }),
]);

// 관리자가 보류(STALLED) 가격 제안에 직접 개입 — Split 보류 개입과 동일한 패턴.
// ACCEPT는 관리자가 정한 최종 금액으로 바로 Order를 생성(에스크로 진입)한다.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = ResolveOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const offer = await prisma.priceOffer.findUnique({
    where: { id },
    include: {
      track: { include: { creator: { select: { id: true, isSeedCreator: true, seedPromoUntil: true } } } },
      license: true,
    },
  });
  if (!offer) {
    return NextResponse.json({ error: "가격 제안을 찾을 수 없습니다" }, { status: 404 });
  }
  if (offer.status !== "STALLED") {
    return NextResponse.json({ error: "보류(STALLED) 상태의 제안만 개입할 수 있습니다" }, { status: 409 });
  }

  if (parsed.data.action === "REJECT") {
    await prisma.$transaction([
      prisma.priceOffer.update({ where: { id }, data: { status: "REJECTED", lastActorId: session!.user.id } }),
      prisma.priceOfferLogEntry.create({
        data: { offerId: id, actorId: session!.user.id, action: "REJECT", amount: offer.amount },
      }),
      prisma.notification.createMany({
        data: [offer.buyerId, offer.track.creatorId].map((userId) => ({
          userId,
          fromUserId: session!.user.id,
          type: "OFFER_REJECTED" as const,
          message: `관리자 개입으로 가격 제안(${offer.track.title})이 거절 처리되었습니다`,
        })),
      }),
    ]);
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  const { amount } = parsed.data;
  const order = await prisma.$transaction(async (tx) => {
    const created = await createOrderAtPrice(tx, {
      trackId: offer.trackId,
      trackTitle: offer.track.title,
      licenseId: offer.licenseId,
      licenseType: offer.license.type as LicenseType,
      buyerId: offer.buyerId,
      price: amount,
      creatorId: offer.track.creatorId,
      isSeedCreator: offer.track.creator.isSeedCreator,
      seedPromoUntil: offer.track.creator.seedPromoUntil,
    });
    await tx.priceOffer.update({
      where: { id },
      data: { status: "ACCEPTED", amount, lastActorId: session!.user.id, orderId: created.id },
    });
    await tx.priceOfferLogEntry.create({
      data: { offerId: id, actorId: session!.user.id, action: "ACCEPT", amount },
    });
    await tx.notification.createMany({
      data: [offer.buyerId, offer.track.creatorId].map((userId) => ({
        userId,
        fromUserId: session!.user.id,
        type: "OFFER_ACCEPTED" as const,
        message: `관리자 개입으로 가격 제안(${offer.track.title})이 ${amount.toLocaleString()}원에 확정되었습니다`,
      })),
    });
    return created;
  });

  return NextResponse.json({ ok: true, status: "ACCEPTED", orderId: order.id });
}
