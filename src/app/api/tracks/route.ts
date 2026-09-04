import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFallbackThumbnail } from "@/lib/generate-thumbnail";

const CreateTrackSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  bpm: z.number().int().positive().optional(),
  bpmAuto: z.boolean().default(true),
  key: z.string().optional(),
  keyAuto: z.boolean().default(true),
  genre: z.string().optional(),
  mood: z.string().optional(),
  tags: z.array(z.string()).default([]),
  fileUrl: z.string().min(1),
  fileSize: z.number().int().positive(),
  thumbnailUrl: z.string().optional(),
  exclusivePrice: z.number().int().positive(),
  nonExclusivePrice: z.number().int().positive(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Creator만 트랙을 등록할 수 있습니다" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateTrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { tags, exclusivePrice, nonExclusivePrice, ...data } = parsed.data;

  const track = await prisma.track.create({
    data: {
      ...data,
      tags: tags.join(","),
      status: "MATCHING", // FR-02: 업로드 완료 → 보컬 매칭 큐
      creatorId: session.user.id,
      licenses: {
        create: [
          { type: "EXCLUSIVE", price: exclusivePrice },
          { type: "NON_EXCLUSIVE", price: nonExclusivePrice },
        ],
      },
    },
  });

  if (!track.thumbnailUrl) {
    const thumbnailUrl = generateFallbackThumbnail(track.id, track.title);
    await prisma.track.update({ where: { id: track.id }, data: { thumbnailUrl } });
    track.thumbnailUrl = thumbnailUrl;
  }

  // 팔로우한 크리에이터의 신곡 알림 — 재방문을 만드는 장치.
  const followers = await prisma.follow.findMany({
    where: { followingId: session.user.id },
    select: { followerId: true },
  });
  if (followers.length > 0) {
    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.followerId,
        fromUserId: session.user.id,
        type: "NEW_TRACK_FROM_FOLLOWED" as const,
        message: `팔로우한 크리에이터가 신곡 "${track.title}"을(를) 올렸습니다`,
      })),
    });
  }

  return NextResponse.json(track, { status: 201 });
}

export async function GET() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { name: true } } },
  });
  return NextResponse.json(tracks);
}
