import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ReportSchema = z.object({
  trackId: z.string().min(1),
  reason: z.string().trim().min(1, "신고 사유를 입력해주세요").max(500),
});

// 로그인한 사용자 누구나 트랙을 신고 — Like와 달리 신고는 토글이 아니라 1회성 제출이라
// 이미 신고한 트랙이면 409로 막는다(@@unique([reporterId, trackId])).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { trackId, reason } = parsed.data;

  const track = await prisma.track.findUnique({ where: { id: trackId }, select: { id: true } });
  if (!track) {
    return NextResponse.json({ error: "트랙을 찾을 수 없습니다" }, { status: 404 });
  }

  const existing = await prisma.report.findUnique({
    where: { reporterId_trackId: { reporterId: session.user.id, trackId } },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 신고한 트랙입니다" }, { status: 409 });
  }

  const report = await prisma.report.create({
    data: { reporterId: session.user.id, trackId, reason },
  });
  return NextResponse.json(report, { status: 201 });
}
