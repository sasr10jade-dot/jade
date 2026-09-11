import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { ADMIN_ACTION_LABEL } from "@/lib/admin";

// 관리자 전용 읽기 전용 상세 — 지원/모더레이션 케이스 조사용. 역할/정지/KYC 변경은
// 여전히 /admin/users 목록의 UserRow에서만(중복 액션 UI 방지).
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      suspended: true,
      kycVerified: true,
      cashBalance: true,
      isSeedCreator: true,
    },
  });
  if (!user) notFound();

  const [tracksCreated, guidesSubmitted, ordersBought, settlementRequests, cashTransactions, supportTickets, adminActions] =
    await Promise.all([
      user.role === "CREATOR"
        ? prisma.track.findMany({
            where: { creatorId: id },
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, status: true, removedByAdmin: true, playCount: true, createdAt: true },
          })
        : Promise.resolve([]),
      user.role === "PERFORMER"
        ? prisma.guide.findMany({
            where: { performerId: id },
            orderBy: { createdAt: "desc" },
            include: { track: { select: { id: true, title: true } } },
          })
        : Promise.resolve([]),
      prisma.order.findMany({
        where: { buyerId: id },
        orderBy: { purchasedAt: "desc" },
        take: 10,
        include: { track: { select: { id: true, title: true } } },
      }),
      prisma.settlementRequest.findMany({ where: { userId: id }, orderBy: { requestedAt: "desc" } }),
      prisma.cashTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.supportTicket.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.adminActionLog.findMany({
        where: { targetType: "USER", targetId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true } } },
      }),
    ]);

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
        ← 사용자 목록
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{user.name}</h2>
        <Badge variant="outline">{user.role}</Badge>
        {user.suspended && <Badge variant="destructive">정지됨</Badge>}
        <Badge variant={user.kycVerified ? "default" : "outline"}>
          {user.kycVerified ? "KYC 인증됨" : "KYC 미인증"}
        </Badge>
        {user.isSeedCreator && <Badge variant="secondary">초기 크리에이터</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {user.email} · 캐시 잔액 {formatKRW(user.cashBalance)} ·{" "}
        {user.createdAt.toLocaleDateString("ko-KR")} 가입
      </p>

      {user.role === "CREATOR" && (
        <Section title={`업로드한 트랙 (${tracksCreated.length}건)`}>
          {tracksCreated.length === 0 ? (
            <Empty />
          ) : (
            tracksCreated.map((t) => (
              <Row key={t.id}>
                <Link href={`/admin/tracks/${t.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {t.title}
                </Link>
                <Badge variant="outline">{t.status}</Badge>
                {t.removedByAdmin && <Badge variant="destructive">관리자 숨김</Badge>}
                <span className="text-xs text-muted-foreground">재생 {t.playCount.toLocaleString()}회</span>
              </Row>
            ))
          )}
        </Section>
      )}

      {user.role === "PERFORMER" && (
        <Section title={`제출한 가이드 (${guidesSubmitted.length}건)`}>
          {guidesSubmitted.length === 0 ? (
            <Empty />
          ) : (
            guidesSubmitted.map((g) => (
              <Row key={g.id}>
                <Link
                  href={`/admin/tracks/${g.track.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {g.track.title}
                </Link>
                <Badge variant="outline">{g.status}</Badge>
              </Row>
            ))
          )}
        </Section>
      )}

      <Section title="최근 구매 내역">
        {ordersBought.length === 0 ? (
          <Empty />
        ) : (
          ordersBought.map((o) => (
            <Row key={o.id}>
              <Link
                href={`/admin/tracks/${o.track.id}`}
                className="min-w-0 flex-1 truncate font-medium hover:underline"
              >
                {o.track.title}
              </Link>
              <span className="text-xs text-muted-foreground">{formatKRW(o.amount)}</span>
              <Badge variant="outline">{o.status}</Badge>
              {o.disputeReason && <Badge variant="destructive">이의 제기</Badge>}
            </Row>
          ))
        )}
      </Section>

      <Section title="정산 신청 내역">
        {settlementRequests.length === 0 ? (
          <Empty />
        ) : (
          settlementRequests.map((s) => (
            <Row key={s.id}>
              <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                {s.requestedAt.toLocaleDateString("ko-KR")} 신청
              </span>
              <span className="text-xs text-muted-foreground">지급액 {formatKRW(s.payoutAmount)}</span>
              <Badge variant={s.status === "PAID" ? "default" : "outline"}>{s.status}</Badge>
            </Row>
          ))
        )}
      </Section>

      <Section title="최근 캐시 내역">
        {cashTransactions.length === 0 ? (
          <Empty />
        ) : (
          cashTransactions.map((c) => (
            <Row key={c.id}>
              <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                {c.createdAt.toLocaleString("ko-KR")}
              </span>
              <Badge variant="outline">{c.type}</Badge>
              <span className={`text-xs font-medium ${c.amount < 0 ? "text-destructive" : "text-primary"}`}>
                {c.amount >= 0 ? "+" : ""}
                {formatKRW(c.amount)}
              </span>
              <span className="text-xs text-muted-foreground">잔액 {formatKRW(c.balanceAfter)}</span>
            </Row>
          ))
        )}
      </Section>

      <Section title="최근 고객문의">
        {supportTickets.length === 0 ? (
          <Empty />
        ) : (
          supportTickets.map((t) => (
            <Row key={t.id}>
              <Link href={`/support/${t.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                {t.subject}
              </Link>
              <Badge variant="outline">{t.status}</Badge>
            </Row>
          ))
        )}
      </Section>

      <Section title="관리자 작업 내역">
        {adminActions.length === 0 ? (
          <Empty />
        ) : (
          adminActions.map((a) => (
            <Row key={a.id}>
              <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                {a.createdAt.toLocaleString("ko-KR")}
              </span>
              <span className="font-medium">{ADMIN_ACTION_LABEL[a.action] ?? a.action}</span>
              <span className="text-xs text-muted-foreground">{a.actor.name}</span>
            </Row>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className="mt-8 text-sm font-semibold">{title}</h3>
      <div className="mt-2 space-y-1.5">{children}</div>
    </>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5 text-sm">{children}</div>;
}

function Empty() {
  return <p className="text-sm text-muted-foreground">내역이 없습니다.</p>;
}
