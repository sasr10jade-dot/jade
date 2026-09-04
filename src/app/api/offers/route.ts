import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ProposeOfferSchema = z.object({
  trackId: z.string().min(1),
  licenseType: z.enum(["EXCLUSIVE", "NON_EXCLUSIVE"]),
  amount: z.number().int().positive(),
});

// 구매자가 특정 라이선스에 원하는 가격을 제안 — 이후 크리에이터가 수락/거절/역제안
// (POST /api/offers/[id]/respond)으로 응답한다. Split 제안(POST /api/splits)과 동일한 패턴.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ProposeOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { trackId, licenseType, amount } = parsed.data;

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { licenses: true },
  });
  if (!track) {
    return NextResponse.json({ error: "트랙을 찾을 수 없습니다" }, { status: 404 });
  }
  if (track.removedByAdmin) {
    return NextResponse.json({ error: "관리자에 의해 숨김 처리된 트랙입니다" }, { status: 403 });
  }
  if (track.creatorId === session.user.id) {
    return NextResponse.json({ error: "본인 트랙에는 가격을 제안할 수 없습니다" }, { status: 403 });
  }

  const license = track.licenses.find((l) => l.type === licenseType);
  if (!license) {
    return NextResponse.json({ error: "선택한 라이선스가 존재하지 않습니다" }, { status: 400 });
  }

  const existing = await prisma.priceOffer.findUnique({
    where: { trackId_licenseId_buyerId: { trackId, licenseId: license.id, buyerId: session.user.id } },
  });
  if (existing && !["REJECTED", "STALLED"].includes(existing.status)) {
    return NextResponse.json({ error: "이미 진행 중인 가격 제안이 있습니다" }, { status: 409 });
  }

  const offer = await prisma.$transaction(async (tx) => {
    const created = existing
      ? await tx.priceOffer.update({
          where: { id: existing.id },
          data: { amount, status: "PROPOSED", counterCount: 0, lastActorId: session.user.id, orderId: null },
        })
      : await tx.priceOffer.create({
          data: { trackId, licenseId: license.id, buyerId: session.user.id, amount, lastActorId: session.user.id },
        });
    await tx.priceOfferLogEntry.create({
      data: { offerId: created.id, actorId: session.user.id, action: "PROPOSE", amount },
    });
    await tx.notification.create({
      data: {
        userId: track.creatorId,
        fromUserId: session.user.id,
        type: "OFFER_PROPOSED",
        message: `가격 제안: ${track.title} (${licenseType}) ${amount.toLocaleString()}원`,
      },
    });
    return created;
  });

  return NextResponse.json(offer, { status: 201 });
}
