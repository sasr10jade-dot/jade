import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/display-name";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "답변 대기중",
  ANSWERED: "답변 완료",
  CLOSED: "종료됨",
};

// OPEN(답변 대기중)이 가장 위로 오도록 상태별 우선순위 정렬 — 관리자가 처리할 게
// 뭔지 한눈에 보이게.
const STATUS_ORDER: Record<string, number> = { OPEN: 0, ANSWERED: 1, CLOSED: 2 };

export default async function AdminSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, nickname: true, displayNickname: true } },
      _count: { select: { replies: true } },
    },
  });
  tickets.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const openCount = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <div>
      <h2 className="text-lg font-semibold">고객 문의</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        답변 대기중 {openCount}건 — 오래된 순이 아니라 미답변 문의가 먼저 보입니다.
      </p>

      {tickets.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">등록된 문의가 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/support/${t.id}`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm transition hover:border-primary/50"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium">{t.subject}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {displayName(t.user)} · {t.createdAt.toLocaleDateString("ko-KR")} · 답변 {t._count.replies}건
                </span>
              </div>
              <Badge variant={t.status === "OPEN" ? "default" : "outline"}>
                {STATUS_LABEL[t.status] ?? t.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
