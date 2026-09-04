import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const UpdateTrackSchema = z.object({
  removedByAdmin: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
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
  return NextResponse.json({ id: track.id, removedByAdmin: track.removedByAdmin });
}
