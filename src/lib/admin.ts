import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { AdminAction, Prisma, PrismaClient } from "@prisma/client";

/** Shared guard for /api/admin/* routes. Returns the session or a 401/403 response. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 }) };
  }
  if (!session.user.isAdmin) {
    return { session: null, error: NextResponse.json({ error: "관리자만 접근할 수 있습니다" }, { status: 403 }) };
  }
  return { session, error: null };
}

/** /admin/admins처럼 최고관리자 전용인 라우트/페이지용 — 운영자(OPERATOR)는 403. */
export async function requireSuperAdmin() {
  const { session, error } = await requireAdmin();
  if (error) return { session: null, error };
  if (session!.user.adminTier !== "SUPER") {
    return { session: null, error: NextResponse.json({ error: "최고관리자만 접근할 수 있습니다" }, { status: 403 }) };
  }
  return { session, error: null };
}

type AdminActionInput = {
  actorId: string;
  action: AdminAction;
  targetType: "USER" | "TRACK" | "ORDER" | "SETTLEMENT" | "REPORT" | "DEPOSIT";
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

// /admin/activity, /admin/users/[id], /admin/tracks/[id] 세 곳에서 공유하는 표시용 헬퍼.
export const ADMIN_ACTION_LABEL: Record<string, string> = {
  USER_UPDATED: "사용자 정보 변경",
  TRACK_VISIBILITY_CHANGED: "트랙 노출 상태 변경",
  ORDER_DISPUTE_RESOLVED: "주문 분쟁 처리",
  SETTLEMENT_PAID: "정산 지급 완료",
  REPORT_RESOLVED: "신고 처리",
  ADMIN_ACCESS_GRANTED: "관리자 권한 부여",
  ADMIN_ACCESS_REVOKED: "관리자 권한 해제",
  ADMIN_TIER_CHANGED: "관리자 등급 변경",
  DEPOSIT_CONFIRMED: "입금 확인 처리",
  DEPOSIT_REJECTED: "입금 거절 처리",
};

// AdminActionLog.metadata는 Json이라 스키마가 없음 — TRACK_VISIBILITY_CHANGED만 선택적으로
// { reason: string } 을 담을 수 있어(숨김 처리 시 관리자가 입력) 안전하게 꺼내 쓴다.
export function getAdminActionReason(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "reason" in metadata) {
    const reason = (metadata as { reason?: unknown }).reason;
    return typeof reason === "string" && reason.length > 0 ? reason : null;
  }
  return null;
}
