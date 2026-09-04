import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LicenseType } from "@/lib/fee";
import { createOrderAtPrice } from "@/lib/orders";

// 역제안 3회 초과 시 협의 보류 — Split 협의(EC-05)와 동일한 규칙.
const MAX_COUNTERS = 3;

const RespondSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ACCEPT") }),
  z.object({ action: z.literal("REJECT") }),
  z.object({ action: z.literal("COUNTER"), amount: z.number().int().positive() }),
]);

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
  const parsed = RespondSchema.safeParse(body);
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

  const isCreator = offer.track.creatorId === session.user.id;
  const isBuyer = offer.buyerId === session.user.id;
  if (!isCreator && !isBuyer) {
    return NextResponse.json({ error: "이 가격 제안의 당사자가 아닙니다" }, { status: 403 });
  }
  if (offer.status === "ACCEPTED" || offer.status === "REJECTED" || offer.status === "STALLED") {
    return NextResponse.json({ error: "이미 종료된 제안입니다" }, { status: 409 });
  }
  if (offer.lastActorId === session.user.id) {
    return NextResponse.json({ error: "상대방의 응답을 기다리는 중입니다" }, { status: 409 });
  }

  const counterpartId = isCreator ? offer.buyerId : offer.track.creatorId;

  if (parsed.data.action === "REJECT") {
    await prisma.$transaction([
      prisma.priceOffer.update({ where: { id }, data: { status: "REJECTED", lastActorId: session.user.id } }),
      prisma.priceOfferLogEntry.create({
        data: { offerId: id, actorId: session.user.id, action: "REJECT", amount: offer.amount },
      }),
      prisma.notification.create({
        data: {
          userId: counterpartId,
          fromUserId: session.user.id,
          type: "OFFER_REJECTED",
          message: `가격 제안 거절: ${offer.track.title} ${offer.amount.toLocaleString()}원`,
        },
      }),
    ]);
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  if (parsed.data.action === "ACCEPT") {
    const order = await prisma.$transaction(async (tx) => {
      const created = await createOrderAtPrice(tx, {
        trackId: offer.trackId,
        trackTitle: offer.track.title,
        licenseId: offer.licenseId,
        licenseType: offer.license.type as LicenseType,
        buyerId: offer.buyerId,
        price: offer.amount,
        creatorId: offer.track.creatorId,
        isSeedCreator: offer.track.creator.isSeedCreator,
        seedPromoUntil: offer.track.creator.seedPromoUntil,
      });
      await tx.priceOffer.update({
        where: { id },
        data: { status: "ACCEPTED", lastActorId: session.user.id, orderId: created.id },
      });
      await tx.priceOfferLogEntry.create({
        data: { offerId: id, actorId: session.user.id, action: "ACCEPT", amount: offer.amount },
      });
      await tx.notification.create({
        data: {
          userId: counterpartId,
          fromUserId: session.user.id,
          type: "OFFER_ACCEPTED",
          message: `가격 제안 수락: ${offer.track.title} ${offer.amount.toLocaleString()}원에 구매가 확정되었습니다`,
        },
      });
      return created;
    });
    return NextResponse.json({ ok: true, status: "ACCEPTED", orderId: order.id });
  }

  // COUNTER
  if (offer.counterCount >= MAX_COUNTERS) {
    await prisma.priceOffer.update({ where: { id }, data: { status: "STALLED" } });
    return NextResponse.json(
      { error: "역제안 횟수를 초과했습니다. 제안이 보류 상태로 전환되었습니다" },
      { status: 409 }
    );
  }

  const { amount } = parsed.data;
  await prisma.$transaction([
    prisma.priceOffer.update({
      where: { id },
      data: { amount, status: "COUNTERED", counterCount: { increment: 1 }, lastActorId: session.user.id },
    }),
    prisma.priceOfferLogEntry.create({
      data: { offerId: id, actorId: session.user.id, action: "COUNTER", amount },
    }),
    prisma.notification.create({
      data: {
        userId: counterpartId,
        fromUserId: session.user.id,
        type: "OFFER_COUNTERED",
        message: `가격 역제안: ${offer.track.title} ${amount.toLocaleString()}원으로 제안합니다`,
      },
    }),
  ]);
  return NextResponse.json({ ok: true, status: "COUNTERED" });
}
