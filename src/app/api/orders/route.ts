import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LicenseType } from "@/lib/fee";
import { createOrderAtPrice } from "@/lib/orders";

const CreateOrderSchema = z.object({
  trackId: z.string().min(1),
  licenseType: z.enum(["EXCLUSIVE", "NON_EXCLUSIVE"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { trackId, licenseType } = parsed.data;

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      licenses: true,
      creator: { select: { id: true, isSeedCreator: true, seedPromoUntil: true } },
    },
  });
  if (!track) {
    return NextResponse.json({ error: "트랙을 찾을 수 없습니다" }, { status: 404 });
  }
  if (track.removedByAdmin) {
    return NextResponse.json({ error: "관리자에 의해 숨김 처리된 트랙입니다" }, { status: 403 });
  }

  const license = track.licenses.find((l) => l.type === licenseType);
  if (!license) {
    return NextResponse.json({ error: "선택한 라이선스가 존재하지 않습니다" }, { status: 400 });
  }

  const order = await prisma.$transaction((tx) =>
    createOrderAtPrice(tx, {
      trackId,
      trackTitle: track.title,
      licenseId: license.id,
      licenseType: licenseType as LicenseType,
      buyerId: session.user.id,
      price: license.price,
      creatorId: track.creatorId,
      isSeedCreator: track.creator.isSeedCreator,
      seedPromoUntil: track.creator.seedPromoUntil,
    })
  );

  return NextResponse.json(order, { status: 201 });
}
