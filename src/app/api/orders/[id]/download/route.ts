import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BLOCKED_STATUSES = new Set(["REFUNDED_FULL", "REFUNDED_PARTIAL"]);

// 구매자가 원본 파일에 접근하는 시점 — Order.downloaded를 여기서 true로 세팅해
// 이후 환불 정책(lib/fee.ts calculateRefund)이 전액/부분 환불을 구분할 수 있게 함.
//
// 알려진 한계: public/uploads 아래 파일은 Next.js가 정적으로 서빙하므로, 이 라우트를
// 거치지 않고 URL을 직접 알면 접근이 가능하다 (S3 presigned GET으로 전환 전까지의
// MVP 한계). 이 엔드포인트는 "다운로드 시각 기록"이 목적이며 완전한 접근 차단은 아니다.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { track: { select: { fileUrl: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "본인의 주문만 다운로드할 수 있습니다" }, { status: 403 });
  }
  if (BLOCKED_STATUSES.has(order.status)) {
    return NextResponse.json({ error: "환불된 주문은 다운로드할 수 없습니다" }, { status: 403 });
  }
  if (!order.track.fileUrl) {
    return NextResponse.json({ error: "원본 파일이 없습니다" }, { status: 404 });
  }

  if (!order.downloaded) {
    await prisma.order.update({ where: { id }, data: { downloaded: true } });
  }

  return NextResponse.redirect(new URL(order.track.fileUrl, req.url));
}
