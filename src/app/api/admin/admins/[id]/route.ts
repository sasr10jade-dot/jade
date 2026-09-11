import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin, logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const UpdateAdminSchema = z.object({
  adminTier: z.enum(["SUPER", "OPERATOR"]).optional(),
  revoke: z.boolean().optional(),
});

// 최고관리자 전용 — 관리자 등급 변경 또는 관리자 권한 해제(role은 건드리지 않음).
// 마지막 남은 최고관리자는 강등/해제할 수 없다(전체 관리자 잠금 방지).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  if (id === session!.user.id) {
    return NextResponse.json(
      { error: "본인의 관리자 권한은 여기서 변경할 수 없습니다" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = UpdateAdminSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "잘못된 입력입니다" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || !target.isAdmin) {
    return NextResponse.json({ error: "관리자를 찾을 수 없습니다" }, { status: 404 });
  }

  const isDemotingSuper =
    target.adminTier === "SUPER" &&
    (parsed.data.revoke || parsed.data.adminTier === "OPERATOR");

  if (isDemotingSuper) {
    const superCount = await prisma.user.count({ where: { isAdmin: true, adminTier: "SUPER" } });
    if (superCount <= 1) {
      return NextResponse.json(
        { error: "마지막 남은 최고관리자는 해제하거나 강등할 수 없습니다" },
        { status: 400 }
      );
    }
  }

  if (parsed.data.revoke) {
    const updated = await prisma.user.update({
      where: { id },
      data: { isAdmin: false, adminTier: null },
    });
    await logAdminAction(prisma, {
      actorId: session!.user.id,
      action: "ADMIN_ACCESS_REVOKED",
      targetType: "USER",
      targetId: id,
      metadata: { previousTier: target.adminTier, email: target.email },
    });
    return NextResponse.json({ id: updated.id, isAdmin: updated.isAdmin, adminTier: updated.adminTier });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { adminTier: parsed.data.adminTier },
  });
  await logAdminAction(prisma, {
    actorId: session!.user.id,
    action: "ADMIN_TIER_CHANGED",
    targetType: "USER",
    targetId: id,
    metadata: { before: target.adminTier, after: parsed.data.adminTier, email: target.email },
  });
  return NextResponse.json({ id: updated.id, isAdmin: updated.isAdmin, adminTier: updated.adminTier });
}
