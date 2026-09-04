import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FollowSchema = z.object({ targetId: z.string().min(1) });

// 팔로우 — 좋아하는 크리에이터의 신곡을 놓치지 않도록. 자기 자신은 팔로우 불가.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = FollowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { targetId } = parsed.data;

  if (targetId === session.user.id) {
    return NextResponse.json({ error: "본인을 팔로우할 수 없습니다" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  const follow = await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: targetId } },
    update: {},
    create: { followerId: session.user.id, followingId: targetId },
  });

  return NextResponse.json(follow, { status: 201 });
}
