import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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
