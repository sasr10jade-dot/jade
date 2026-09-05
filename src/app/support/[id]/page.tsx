import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/display-name";
import { ReplyForm } from "./reply-form";
import { CloseTicketButton } from "./close-ticket-button";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "답변 대기중",
  ANSWERED: "답변 완료",
  CLOSED: "종료됨",
};

// 사용자용/관리자용 화면을 하나로 공유 — 관리자는 role만 다를 뿐 같은 스레드를 보고,
// "답변 등록" 버튼과 종료 버튼만 추가로 노출된다.
export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, nickname: true, displayNickname: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, nickname: true, displayNickname: true } } },
      },
    },
  });
  if (!ticket) notFound();

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = ticket.userId === session.user.id;
  if (!isAdmin && !isOwner) notFound();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{ticket.subject}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {displayName(ticket.user)} · {ticket.createdAt.toLocaleDateString("ko-KR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{STATUS_LABEL[ticket.status] ?? ticket.status}</Badge>
          {isAdmin && ticket.status !== "CLOSED" && <CloseTicketButton ticketId={ticket.id} />}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="rounded-lg border p-4 text-sm">
          <p className="whitespace-pre-line">{ticket.message}</p>
        </div>
        {ticket.replies.map((r) => (
          <div
            key={r.id}
            className={`rounded-lg border p-4 text-sm ${r.isAdmin ? "border-primary/40 bg-primary/5" : ""}`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {r.isAdmin ? "관리자" : displayName(r.author)}
              </span>
              <span>{r.createdAt.toLocaleDateString("ko-KR")}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-line">{r.message}</p>
          </div>
        ))}
      </div>

      <ReplyForm ticketId={ticket.id} isAdmin={isAdmin} />
    </div>
  );
}
