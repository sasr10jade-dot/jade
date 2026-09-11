import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin, logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const GrantSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  adminTier: z.enum(["SUPER", "OPERATOR"]),
});

// 최고관리자만 — 이메일로 기존 사용자를 찾아 isAdmin/adminTier만 추가한다(role은 그대로
// 유지 — Creator 등 본업 역할과 관리자 권한을 겸할 수 있어야 함).
export async function POST(req: Request) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = GrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!target) {
    return NextResponse.json({ error: "해당 이메일의 사용자를 찾을 수 없습니다" }, { status: 404 });
  }
  if (target.isAdmin) {
    return NextResponse.json({ error: "이미 관리자입니다" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { isAdmin: true, adminTier: parsed.data.adminTier },
  });
  await logAdminAction(prisma, {
    actorId: session!.user.id,
    action: "ADMIN_ACCESS_GRANTED",
    targetType: "USER",
    targetId: target.id,
    metadata: { adminTier: parsed.data.adminTier, email: target.email },
  });
  return NextResponse.json({ id: updated.id, email: updated.email, adminTier: updated.adminTier });
}
