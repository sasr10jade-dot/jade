import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateGuideSchema = z.object({
  trackId: z.string().min(1),
  audioUrl: z.string().min(1),
  splitAsk: z.number().min(0).max(100),
});

// FR-02 status values that mean "already confirmed, no longer accepting guides" (EC-04).
const CLOSED_STATUSES = new Set(["SPLIT_AGREED", "LISTED"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (session.user.role !== "PERFORMER") {
    return NextResponse.json({ error: "Performer만 가이드를 제출할 수 있습니다" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateGuideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { trackId, audioUrl, splitAsk } = parsed.data;

  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) {
    return NextResponse.json({ error: "트랙을 찾을 수 없습니다" }, { status: 404 });
  }
  if (CLOSED_STATUSES.has(track.status)) {
    return NextResponse.json(
      { error: "이미 확정된 트랙입니다. 가이드를 제출할 수 없습니다" },
      { status: 409 }
    );
  }

  const existing = await prisma.guide.findUnique({
    where: { trackId_performerId: { trackId, performerId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 이 트랙에 가이드를 제출했습니다" },
      { status: 409 }
    );
  }

  const [guide] = await prisma.$transaction([
    prisma.guide.create({
      data: { trackId, performerId: session.user.id, audioUrl, splitAsk },
    }),
    prisma.track.update({
      where: { id: trackId },
      data: { status: track.status === "DRAFT" ? "MATCHING" : track.status },
    }),
    prisma.notification.create({
      data: {
        userId: track.creatorId,
        fromUserId: session.user.id,
        type: "GUIDE_SUBMITTED",
        message: `가이드 제출: ${track.title}에 가이드를 제출했어요`,
      },
    }),
  ]);

  return NextResponse.json(guide, { status: 201 });
}
