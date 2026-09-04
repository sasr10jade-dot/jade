import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SelectSchema = z.object({ offerId: z.string().min(1) });

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
  const parsed = SelectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const request = await prisma.commissionRequest.findUnique({
    where: { id },
    include: { offers: true },
  });
  if (!request) {
    return NextResponse.json({ error: "의뢰를 찾을 수 없습니다" }, { status: 404 });
  }
  if (request.buyerId !== session.user.id) {
    return NextResponse.json({ error: "본인의 의뢰만 선정할 수 있습니다" }, { status: 403 });
  }
  if (request.status !== "OPEN") {
    return NextResponse.json({ error: "이미 종료된 의뢰입니다" }, { status: 409 });
  }

  const selected = request.offers.find((o) => o.id === parsed.data.offerId);
  if (!selected) {
    return NextResponse.json({ error: "해당 지원을 찾을 수 없습니다" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.commissionOffer.update({ where: { id: selected.id }, data: { status: "SELECTED" } });
    await tx.commissionRequest.update({ where: { id }, data: { status: "MATCHED" } });
    await tx.notification.create({
      data: {
        userId: selected.creatorId,
        fromUserId: session.user.id,
        type: "COMMISSION_SELECTED",
        message: `"${request.title}" 의뢰에 선정되었습니다. 곡을 납품해주세요`,
      },
    });

    const rejected = request.offers.filter((o) => o.id !== selected.id && o.status === "PENDING");
    if (rejected.length > 0) {
      await tx.commissionOffer.updateMany({
        where: { id: { in: rejected.map((o) => o.id) } },
        data: { status: "REJECTED" },
      });
      await tx.notification.createMany({
        data: rejected.map((o) => ({
          userId: o.creatorId,
          fromUserId: session.user.id,
          type: "COMMISSION_REJECTED" as const,
          message: `"${request.title}" 의뢰에서 다른 지원이 선정되었습니다`,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true, status: "MATCHED" });
}
