import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// EC-05: 역제안 3회 초과 시 협의 보류.
const MAX_COUNTERS = 3;

const RespondSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ACCEPT") }),
  z.object({
    action: z.literal("COUNTER"),
    creatorShare: z.number().min(0).max(100),
    performerShare: z.number().min(0).max(100),
  }),
]);

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
  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  if (
    parsed.data.action === "COUNTER" &&
    Math.round(parsed.data.creatorShare + parsed.data.performerShare) !== 100
  ) {
    return NextResponse.json(
      { error: "Creator/Performer 분배율의 합이 100이어야 합니다" },
      { status: 400 }
    );
  }

  const split = await prisma.split.findUnique({
    where: { id },
    include: { track: true },
  });
  if (!split) {
    return NextResponse.json({ error: "Split을 찾을 수 없습니다" }, { status: 404 });
  }

  const isCreator = split.track.creatorId === session.user.id;
  const isPerformer = split.performerId === session.user.id;
  if (!isCreator && !isPerformer) {
    return NextResponse.json({ error: "이 Split 협의의 당사자가 아닙니다" }, { status: 403 });
  }

  if (split.status === "AGREED" || split.status === "STALLED") {
    return NextResponse.json({ error: "이미 종료된 협의입니다" }, { status: 409 });
  }

  if (split.lastActorId === session.user.id) {
    return NextResponse.json(
      { error: "상대방의 응답을 기다리는 중입니다" },
      { status: 409 }
    );
  }

  const counterpartId = isCreator ? split.performerId : split.track.creatorId;

  if (parsed.data.action === "ACCEPT") {
    await prisma.$transaction([
      prisma.split.update({
        where: { id },
        data: { status: "AGREED", agreedAt: new Date(), lastActorId: session.user.id },
      }),
      prisma.track.update({
        where: { id: split.trackId },
        data: { status: "SPLIT_AGREED" },
      }),
      // 합의된 상대 Performer의 가이드는 SELECTED, 나머지 경쟁 가이드는 REJECTED (FR-03).
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
          actorId: session.user.id,
          action: "ACCEPT",
          creatorShare: split.creatorShare,
          performerShare: split.performerShare,
        },
      }),
      prisma.notification.create({
        data: {
          userId: counterpartId,
          fromUserId: session.user.id,
          type: "SPLIT_AGREED",
          message: `Split 합의 완료: ${split.track.title} ${split.creatorShare} / ${split.performerShare}`,
        },
      }),
    ]);
    return NextResponse.json({ ok: true, status: "AGREED" });
  }

  // COUNTER
  if (split.counterCount >= MAX_COUNTERS) {
    await prisma.split.update({ where: { id }, data: { status: "STALLED" } });
    return NextResponse.json(
      { error: "역제안 횟수를 초과했습니다. 협의가 보류 상태로 전환되었습니다" },
      { status: 409 }
    );
  }

  const { creatorShare, performerShare } = parsed.data;
  await prisma.$transaction([
    prisma.split.update({
      where: { id },
      data: {
        creatorShare,
        performerShare,
        status: "COUNTERED",
        counterCount: { increment: 1 },
        lastActorId: session.user.id,
      },
    }),
    prisma.splitLogEntry.create({
      data: {
        splitId: id,
        actorId: session.user.id,
        action: "COUNTER",
        creatorShare,
        performerShare,
      },
    }),
    prisma.notification.create({
      data: {
        userId: counterpartId,
        fromUserId: session.user.id,
        type: "SPLIT_COUNTERED",
        message: `Split 역제안: ${split.track.title} ${creatorShare} / ${performerShare}로 제안합니다`,
      },
    }),
  ]);
  return NextResponse.json({ ok: true, status: "COUNTERED" });
}
