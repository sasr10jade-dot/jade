import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// 관리자가 정산 신청을 "지급 완료"로 처리 — 실제 은행 송금은 앱 밖에서 수동으로 이뤄지고
// (Section 12: 주 2회 화/금 배치), 여기서는 그 결과만 기록한다.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const request = await prisma.settlementRequest.findUnique({ where: { id } });
  if (!request) {
    return NextResponse.json({ error: "정산 요청을 찾을 수 없습니다" }, { status: 404 });
  }
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "이미 처리된 요청입니다" }, { status: 409 });
  }

  const updated = await prisma.settlementRequest.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
  return NextResponse.json(updated);
}
