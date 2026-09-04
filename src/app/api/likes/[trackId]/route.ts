import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { trackId } = await params;
  await prisma.like.deleteMany({
    where: { userId: session.user.id, trackId },
  });

  return NextResponse.json({ ok: true });
}
