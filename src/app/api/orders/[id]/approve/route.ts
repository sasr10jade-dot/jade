import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseEscrow } from "@/lib/settlement";

// 구매자가 원본 인도를 확인하고 [승인]을 눌러 에스크로를 즉시 해제 — 7일 자동승인을
// 기다리지 않고 바로 판매자에게 정산되도록 하는 경로.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "본인 주문만 승인할 수 있습니다" }, { status: 403 });
  }
  if (order.status !== "ESCROW") {
    return NextResponse.json({ error: "에스크로 보호 중인 주문만 승인할 수 있습니다" }, { status: 409 });
  }

  await prisma.$transaction((tx) => releaseEscrow(tx, id));

  return NextResponse.json({ ok: true, status: "SETTLED" });
}
