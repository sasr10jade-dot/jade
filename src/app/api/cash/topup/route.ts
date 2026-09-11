import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TopupSchema = z.object({
  amount: z.number().int().min(10_000, "최소 입금 신청 금액은 10,000 캐시입니다").max(10_000_000, "1회 최대 신청액은 1,000만 캐시입니다"),
  depositorName: z.string().trim().min(1, "입금자명을 입력해주세요").max(30, "입금자명이 너무 깁니다"),
});

// 무통장 입금(PG 연동 전 임시 결제 수단) 신청 생성 — 여기선 캐시가 움직이지 않는다.
// 관리자가 실제 계좌 입금을 대조 확인해 /api/admin/deposits/[id]/confirm을 호출할 때만
// creditCash가 실행된다.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = TopupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const request = await prisma.cashTopupRequest.create({
    data: {
      userId: session.user.id,
      amount: parsed.data.amount,
      depositorName: parsed.data.depositorName,
    },
  });

  return NextResponse.json(request, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const requests = await prisma.cashTopupRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { requestedAt: "desc" },
  });
  return NextResponse.json(requests);
}
