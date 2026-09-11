import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const UpdateTrackSchema = z.object({
  removedByAdmin: z.boolean(),
  reason: z.string().trim().min(1).optional(), // 숨김 처리 시(선택) — 왜 숨겼는지 감사 로그에 남김
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateTrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const track = await prisma.track.update({
    where: { id },
    data: { removedByAdmin: parsed.data.removedByAdmin },
  });
  await logAdminAction(prisma, {
    actorId: session!.user.id,
    action: "TRACK_VISIBILITY_CHANGED",
    targetType: "TRACK",
    targetId: id,
    metadata: { removedByAdmin: parsed.data.removedByAdmin, reason: parsed.data.reason },
  });
  return NextResponse.json({ id: track.id, removedByAdmin: track.removedByAdmin });
}
