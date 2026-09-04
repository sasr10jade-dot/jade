import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { expireOverdueCommissions } from "@/lib/commissions";

const LICENSE_LABEL: Record<string, string> = {
  EXCLUSIVE: "Exclusive",
  NON_EXCLUSIVE: "Non-Exclusive",
};

function daysLeft(deadline: Date) {
  return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default async function CommissionsPage() {
  await expireOverdueCommissions();
  const session = await auth();

  const [open, mine] = await Promise.all([
    prisma.commissionRequest.findMany({
      where: { status: "OPEN" },
      orderBy: { deadline: "asc" },
      include: {
        buyer: { select: { name: true, nickname: true, displayNickname: true } },
        _count: { select: { offers: true } },
      },
    }),
    session?.user
      ? prisma.commissionRequest.findMany({
          where: { buyerId: session.user.id },
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { offers: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">곡 의뢰</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            원하는 조건을 올리면 크리에이터들이 가격을 제안합니다 — 완성곡을 찾는 대신, 직접 의뢰해보세요.
          </p>
        </div>
        {session?.user && (
          <Link href="/commissions/new">
            <Button>+ 의뢰 등록</Button>
          </Link>
        )}
      </div>

      {mine.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground">내가 등록한 의뢰</h2>
          <div className="mt-3 space-y-2">
            {mine.map((r) => (
              <Link
                key={r.id}
                href={`/commissions/${r.id}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary/50"
              >
                <span className="font-medium">{r.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  지원 {r._count.offers}건 <Badge variant="outline">{r.status}</Badge>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-muted-foreground">지원 가능한 의뢰</h2>
      {open.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          현재 모집 중인 의뢰가 없습니다.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {open.map((r) => (
            <Link
              key={r.id}
              href={`/commissions/${r.id}`}
              className="block rounded-lg border p-4 transition hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{r.title}</span>
                <Badge variant="outline">D-{daysLeft(r.deadline)}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {displayName(r.buyer)} · {r.genre ?? "장르 미정"} · {r.mood ?? "무드 미정"} ·{" "}
                {LICENSE_LABEL[r.licenseType]} · 예산 {formatKRW(r.budgetMin)} ~ {formatKRW(r.budgetMax)} · 지원{" "}
                {r._count.offers}건
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
