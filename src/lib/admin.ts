import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { AdminAction, Prisma, PrismaClient } from "@prisma/client";

/** Shared guard for /api/admin/* routes. Returns the session or a 401/403 response. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "관리자만 접근할 수 있습니다" }, { status: 403 }) };
  }
  return { session, error: null };
}

type AdminActionInput = {
  actorId: string;
  action: AdminAction;
  targetType: "USER" | "TRACK" | "ORDER" | "SETTLEMENT";
  targetId: string;
  metadata?: Prisma.InputJsonValue;
};

// 관리자 작업 감사 로그 — db에 prisma를 그대로 넘기거나(단일 쓰기), 이미 열려있는 트랜잭션의
// tx를 넘기면(예: orders/[id]/resolve) 그 트랜잭션 안에서 원자적으로 함께 기록된다.
export async function logAdminAction(
  db: PrismaClient | Prisma.TransactionClient,
  { actorId, action, targetType, targetId, metadata }: AdminActionInput
) {
  await db.adminActionLog.create({ data: { actorId, action, targetType, targetId, metadata } });
}
