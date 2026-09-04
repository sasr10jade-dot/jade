import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creditCash } from "@/lib/cash";

const TopupSchema = z.object({
  amount: z.number().int().positive().max(10_000_000, "1회 최대 충전액은 1,000만 캐시입니다"),
});

// 원화 결제(개발용 모의 결제 — 토스페이먼츠 연동 전, checkout과 동일 패턴) → VOICE Cash
// 1:1 충전. 실 서비스에선 이 자리가 실제 PG 콜백 검증 지점이 된다.
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

  const balance = await prisma.$transaction((tx) =>
    creditCash(tx, session.user.id, parsed.data.amount, "TOPUP", { memo: "모의 결제 충전" })
  );

  return NextResponse.json({ cashBalance: balance });
}
