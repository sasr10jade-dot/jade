import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LikeSchema = z.object({ trackId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = LikeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { trackId } = parsed.data;

  const track = await prisma.track.findUnique({ where: { id: trackId }, select: { id: true } });
  if (!track) {
    return NextResponse.json({ error: "트랙을 찾을 수 없습니다" }, { status: 404 });
  }

  const like = await prisma.like.upsert({
    where: { userId_trackId: { userId: session.user.id, trackId } },
    update: {},
    create: { userId: session.user.id, trackId },
  });

  return NextResponse.json(like, { status: 201 });
}
