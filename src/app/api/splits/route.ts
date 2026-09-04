import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ProposeSplitSchema = z
  .object({
    trackId: z.string().min(1),
    performerId: z.string().min(1),
    creatorShare: z.number().min(0).max(100),
    performerShare: z.number().min(0).max(100),
  })
  .refine((v) => Math.round(v.creatorShare + v.performerShare) === 100, {
    message: "Creator/Performer 분배율의 합이 100이어야 합니다",
  });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Creator만 Split을 제안할 수 있습니다" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ProposeSplitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { trackId, performerId, creatorShare, performerShare } = parsed.data;

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { split: true },
  });
  if (!track) {
    return NextResponse.json({ error: "트랙을 찾을 수 없습니다" }, { status: 404 });
  }
  if (track.creatorId !== session.user.id) {
    return NextResponse.json({ error: "본인 트랙에만 Split을 제안할 수 있습니다" }, { status: 403 });
  }
  if (track.split) {
    return NextResponse.json({ error: "이미 Split 협의가 진행 중입니다" }, { status: 409 });
  }

  const guide = await prisma.guide.findUnique({
    where: { trackId_performerId: { trackId, performerId } },
  });
  if (!guide) {
    return NextResponse.json(
      { error: "해당 트랙에 가이드를 제출한 보컬에게만 Split을 제안할 수 있습니다" },
      { status: 404 }
    );
  }

  const split = await prisma.$transaction(async (tx) => {
    const created = await tx.split.create({
      data: { trackId, performerId, creatorShare, performerShare, lastActorId: session.user.id },
    });
    await tx.splitLogEntry.create({
      data: {
        splitId: created.id,
        actorId: session.user.id,
        action: "PROPOSE",
        creatorShare,
        performerShare,
      },
    });
    await tx.notification.create({
      data: {
        userId: performerId,
        fromUserId: session.user.id,
        type: "SPLIT_PROPOSED",
        message: `Split 제안: ${track.title}에 ${creatorShare} / ${performerShare}로 제안합니다`,
      },
    });
    return created;
  });

  return NextResponse.json(split, { status: 201 });
}
