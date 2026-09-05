import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다" }, { status: 404 });
  }

  await prisma.supportTicket.update({ where: { id }, data: { status: "CLOSED" } });
  return NextResponse.json({ ok: true });
}
