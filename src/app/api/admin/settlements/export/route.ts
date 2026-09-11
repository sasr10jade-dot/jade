import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map((f) => csvEscape(String(f))).join(",");
}

// 정산 신청 전체를 CSV로 내보냄 — 세무/회계 정리용(원천징수 3.3% 포함). 관리자 화면엔
// PENDING 전체 + 최근 지급 20건만 보이지만, 내보내기는 기간 제한 없이 전체를 담는다.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const requests = await prisma.settlementRequest.findMany({
    orderBy: { requestedAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const header = csvRow(["이름", "이메일", "신청금액", "원천징수", "지급액", "상태", "신청일", "지급일"]);
  const rows = requests.map((s) =>
    csvRow([
      s.user.name,
      s.user.email,
      s.amount,
      s.withholding,
      s.payoutAmount,
      s.status,
      s.requestedAt.toISOString(),
      s.paidAt?.toISOString() ?? "",
    ])
  );
  // BOM — Excel에서 UTF-8 한글이 깨지지 않도록.
  const csv = "﻿" + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="settlements-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
