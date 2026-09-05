import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "답변 대기중",
  ANSWERED: "답변 완료",
  CLOSED: "종료됨",
};

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { replies: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">고객센터</h1>
          <p className="mt-1 text-sm text-muted-foreground">문의를 등록하면 관리자가 확인 후 답변합니다.</p>
        </div>
        <Link href="/support/new">
          <Button>+ 문의하기</Button>
        </Link>
      </div>

      {tickets.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          등록한 문의가 없습니다.
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/support/${t.id}`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm transition hover:border-primary/50"
            >
              <span className="font-medium">{t.subject}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                답변 {t._count.replies}건 <Badge variant="outline">{STATUS_LABEL[t.status] ?? t.status}</Badge>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
