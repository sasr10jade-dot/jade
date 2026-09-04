import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 이미 업로드한 트랙 수정용 — 음원/제목/장르/BPM/가사/썸네일을 부분적으로 바꿀 수 있음.
// 전부 optional이라 클라이언트는 바뀐 필드만 보내면 됨.
const UpdateTrackSchema = z.object({
  title: z.string().min(1).optional(),
  genre: z.string().optional(),
  bpm: z.number().int().positive().optional(),
  lyrics: z.string().optional(),
  thumbnailUrl: z.string().min(1).optional(),
  fileUrl: z.string().min(1).optional(),
  fileSize: z.number().int().positive().optional(),
  exclusivePrice: z.number().int().positive().optional(),
  nonExclusivePrice: z.number().int().positive().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateTrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const track = await prisma.track.findUnique({
    where: { id },
    select: { creatorId: true, licenses: true },
  });
  if (!track) {
    return NextResponse.json({ error: "트랙을 찾을 수 없습니다" }, { status: 404 });
  }
  if (track.creatorId !== session.user.id) {
    return NextResponse.json({ error: "본인 트랙만 수정할 수 있습니다" }, { status: 403 });
  }

  const { fileUrl, fileSize, exclusivePrice, nonExclusivePrice, ...rest } = parsed.data;
  if ((fileUrl && !fileSize) || (!fileUrl && fileSize)) {
    return NextResponse.json(
      { error: "음원 파일을 교체하려면 fileUrl과 fileSize를 함께 보내주세요" },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (exclusivePrice) {
      const license = track.licenses.find((l) => l.type === "EXCLUSIVE");
      if (license) await tx.license.update({ where: { id: license.id }, data: { price: exclusivePrice } });
    }
    if (nonExclusivePrice) {
      const license = track.licenses.find((l) => l.type === "NON_EXCLUSIVE");
      if (license) await tx.license.update({ where: { id: license.id }, data: { price: nonExclusivePrice } });
    }
    return tx.track.update({
      where: { id },
      data: { ...rest, ...(fileUrl && fileSize ? { fileUrl, fileSize } : {}) },
    });
  });
  return NextResponse.json(updated);
}
