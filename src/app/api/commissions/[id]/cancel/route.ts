import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const request = await prisma.commissionRequest.findUnique({
    where: { id },
    include: { offers: { where: { status: "PENDING" } } },
  });
  if (!request) {
    return NextResponse.json({ error: "의뢰를 찾을 수 없습니다" }, { status: 404 });
  }
  if (request.buyerId !== session.user.id) {
    return NextResponse.json({ error: "본인의 의뢰만 취소할 수 있습니다" }, { status: 403 });
  }
  // MATCHED 이후(선정된 크리에이터가 이미 작업을 시작했을 수 있음)는 취소 대상에서 제외 —
  // 지원 모집 단계(OPEN)에서만 구매자가 부담 없이 취소할 수 있게 한다.
  if (request.status !== "OPEN") {
    return NextResponse.json({ error: "지원 모집 중인 의뢰만 취소할 수 있습니다" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.commissionRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    if (request.offers.length > 0) {
      await tx.commissionOffer.updateMany({
        where: { id: { in: request.offers.map((o) => o.id) } },
        data: { status: "REJECTED" },
      });
      await tx.notification.createMany({
        data: request.offers.map((o) => ({
          userId: o.creatorId,
          fromUserId: session.user.id,
          type: "COMMISSION_CANCELLED" as const,
          message: `"${request.title}" 의뢰가 구매자에 의해 취소되었습니다`,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true, status: "CANCELLED" });
}
