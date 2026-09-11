import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// ADMIN은 여기서 부여 불가 — 별도 isAdmin/adminTier로 관리(/api/admin/admins, 최고관리자 전용).
const UpdateUserSchema = z.object({
  role: z.enum(["CREATOR", "PERFORMER", "BUYER"]).optional(),
  suspended: z.boolean().optional(),
  kycVerified: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (id === session!.user.id) {
    return NextResponse.json(
      { error: "본인 계정의 역할/정지 상태는 변경할 수 없습니다" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "변경할 값이 없습니다" }, { status: 400 });
  }

  const before = await prisma.user.findUnique({
    where: { id },
    select: { role: true, suspended: true, kycVerified: true },
  });
  const user = await prisma.user.update({ where: { id }, data: parsed.data });
  await logAdminAction(prisma, {
    actorId: session!.user.id,
    action: "USER_UPDATED",
    targetType: "USER",
    targetId: id,
    metadata: { before, after: parsed.data },
  });
  return NextResponse.json({
    id: user.id,
    role: user.role,
    suspended: user.suspended,
    kycVerified: user.kycVerified,
  });
}
