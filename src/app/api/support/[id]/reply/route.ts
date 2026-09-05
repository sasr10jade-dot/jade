import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ReplySchema = z.object({ message: z.string().min(1, "내용을 입력해주세요") });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = ticket.userId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "본인의 문의만 열람할 수 있습니다" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supportTicketReply.create({
      data: { ticketId: id, authorId: session.user.id, message: parsed.data.message, isAdmin },
    });
    // 관리자가 답변하면 ANSWERED + 알림, 사용자가 다시 답장하면(답변/종료 이후라도)
    // 문의가 재개된 것이므로 OPEN으로 되돌려 관리자 큐에 다시 노출.
    await tx.supportTicket.update({ where: { id }, data: { status: isAdmin ? "ANSWERED" : "OPEN" } });
    if (isAdmin) {
      await tx.notification.create({
        data: {
          userId: ticket.userId,
          fromUserId: session.user.id,
          type: "SUPPORT_TICKET_REPLIED",
          message: `"${ticket.subject}" 문의에 답변이 등록되었습니다`,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
