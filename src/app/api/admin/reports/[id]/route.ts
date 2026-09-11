import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const ResolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

// 관리자가 신고를 처리 완료(조치함)/기각(문제없음) 처리 — 신고 처리 자체가 트랙을
// 자동으로 숨기진 않음, 필요하면 /admin/tracks에서 별도로 숨김 처리.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = ResolveReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const report = await prisma.report.findUnique({
    where: { id },
    include: { track: { select: { title: true } } },
  });
  if (!report) {
    return NextResponse.json({ error: "신고를 찾을 수 없습니다" }, { status: 404 });
  }
  if (report.status !== "OPEN") {
    return NextResponse.json({ error: "이미 처리된 신고입니다" }, { status: 409 });
  }

  const updated = await prisma.report.update({
    where: { id },
    data: { status: parsed.data.status, resolvedAt: new Date() },
  });
  await logAdminAction(prisma, {
    actorId: session!.user.id,
    action: "REPORT_RESOLVED",
    targetType: "REPORT",
    targetId: id,
    metadata: { status: parsed.data.status, trackId: report.trackId, trackTitle: report.track.title, reason: report.reason },
  });
  return NextResponse.json(updated);
}
