import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const ResolveSplitSchema = z
  .object({
    creatorShare: z.number().min(0).max(100),
    performerShare: z.number().min(0).max(100),
  })
  .refine((v) => Math.round(v.creatorShare + v.performerShare) === 100, {
    message: "Creator/Performer 분배율의 합이 100이어야 합니다",
  });

// 관리자가 STALLED(EC-05) Split에 직접 개입해 최종 분배율을 확정한다.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = ResolveSplitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const split = await prisma.split.findUnique({
    where: { id },
    include: { track: { select: { creatorId: true } } },
  });
  if (!split) {
    return NextResponse.json({ error: "Split을 찾을 수 없습니다" }, { status: 404 });
  }
  if (split.status !== "STALLED") {
    return NextResponse.json({ error: "보류(STALLED) 상태의 Split만 개입할 수 있습니다" }, { status: 409 });
  }

  const { creatorShare, performerShare } = parsed.data;
  await prisma.$transaction([
    prisma.split.update({
      where: { id },
      data: {
        creatorShare,
        performerShare,
        status: "AGREED",
        agreedAt: new Date(),
        lastActorId: session!.user.id,
      },
    }),
    prisma.track.update({ where: { id: split.trackId }, data: { status: "SPLIT_AGREED" } }),
    prisma.guide.updateMany({
      where: { trackId: split.trackId, performerId: split.performerId },
      data: { status: "SELECTED" },
    }),
    prisma.guide.updateMany({
      where: { trackId: split.trackId, performerId: { not: split.performerId } },
      data: { status: "REJECTED" },
    }),
    prisma.splitLogEntry.create({
      data: {
        splitId: id,
        actorId: session!.user.id,
        action: "ACCEPT",
        creatorShare,
        performerShare,
      },
    }),
    prisma.notification.createMany({
      data: [split.performerId, split.track.creatorId].map((userId) => ({
        userId,
        fromUserId: session!.user.id,
        type: "SPLIT_AGREED" as const,
        message: `관리자 개입으로 Split이 ${creatorShare} / ${performerShare}로 확정되었습니다`,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true, status: "AGREED" });
}
