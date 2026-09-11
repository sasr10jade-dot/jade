import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { ADMIN_ACTION_LABEL, getAdminActionReason } from "@/lib/admin";

// 관리자 전용 읽기 전용 상세 — 모더레이션/분쟁 조사용. 숨김 처리 자체는 여전히
// /admin/tracks 목록의 TrackRow에서만(중복 액션 UI 방지).
export default async function AdminTrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = await prisma.track.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      split: { include: { performer: { select: { name: true } } } },
      guides: { orderBy: { createdAt: "asc" }, include: { performer: { select: { name: true } } } },
      licenses: true,
      orders: {
        orderBy: { purchasedAt: "desc" },
        include: { buyer: { select: { id: true, name: true, email: true } } },
      },
      reviews: { orderBy: { createdAt: "desc" }, take: 10, include: { author: { select: { name: true } } } },
    },
  });
  if (!track) notFound();

  const [adminActions, reports] = await Promise.all([
    prisma.adminActionLog.findMany({
      where: { targetType: "TRACK", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } } },
    }),
    prisma.report.findMany({
      where: { trackId: id },
      orderBy: { createdAt: "desc" },
      include: { reporter: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <Link href="/admin/tracks" className="text-sm text-muted-foreground hover:underline">
        ← 트랙 목록
      </Link>

      <div className="mt-3 flex items-start gap-4">
        {track.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.thumbnailUrl} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{track.title}</h2>
            <Badge variant="outline">{track.status}</Badge>
            {track.removedByAdmin && <Badge variant="destructive">관리자 숨김</Badge>}
            {track.removedByCreator && <Badge variant="secondary">크리에이터 비공개</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/admin/users/${track.creator.id}`} className="hover:underline">
              {track.creator.name} ({track.creator.email})
            </Link>{" "}
            · {track.genre ?? "장르 미정"} · {track.mood ?? "무드 미정"} · {track.bpm ?? "-"} BPM ·{" "}
            {track.key ?? "-"} · 재생 {track.playCount.toLocaleString()}회
          </p>
        </div>
      </div>

      {track.split && (
        <Section title="Split">
          <Row>
            <span className="min-w-0 flex-1">{track.split.performer.name}</span>
            <span className="text-xs text-muted-foreground">
              Creator {track.split.creatorShare}% / Performer {track.split.performerShare}%
            </span>
            <Badge variant={track.split.status === "AGREED" ? "default" : "outline"}>{track.split.status}</Badge>
          </Row>
        </Section>
      )}

      <Section title={`가이드 (${track.guides.length}건)`}>
        {track.guides.length === 0 ? (
          <Empty />
        ) : (
          track.guides.map((g) => (
            <Row key={g.id}>
              <span className="min-w-0 flex-1">{g.performer.name}</span>
              <span className="text-xs text-muted-foreground">희망 분배 {g.splitAsk}%</span>
              <Badge variant="outline">{g.status}</Badge>
            </Row>
          ))
        )}
      </Section>

      <Section title="라이선스">
        {track.licenses.map((l) => (
          <Row key={l.id}>
            <span className="min-w-0 flex-1">{l.type}</span>
            <span className="text-xs text-muted-foreground">{formatKRW(l.price)}</span>
          </Row>
        ))}
      </Section>

      <Section title={`주문 내역 (${track.orders.length}건)`}>
        {track.orders.length === 0 ? (
          <Empty />
        ) : (
          track.orders.map((o) => (
            <Row key={o.id}>
              <Link
                href={`/admin/users/${o.buyer.id}`}
                className="min-w-0 flex-1 truncate font-medium hover:underline"
              >
                {o.buyer.name}
              </Link>
              <span className="text-xs text-muted-foreground">{formatKRW(o.amount)}</span>
              <Badge variant="outline">{o.status}</Badge>
              {o.disputeReason && <Badge variant="destructive">이의 제기</Badge>}
            </Row>
          ))
        )}
      </Section>

      <Section title="최근 리뷰">
        {track.reviews.length === 0 ? (
          <Empty />
        ) : (
          track.reviews.map((r) => (
            <Row key={r.id}>
              <span className="text-primary" aria-label={`5점 만점에 ${r.rating}점`}>
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.comment}</span>
              <span className="text-xs text-muted-foreground">{r.author.name}</span>
            </Row>
          ))
        )}
      </Section>

      <Section title={`신고 내역 (${reports.length}건)`}>
        {reports.length === 0 ? (
          <Empty />
        ) : (
          reports.map((r) => (
            <Row key={r.id}>
              <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                {r.createdAt.toLocaleString("ko-KR")}
              </span>
              <span className="text-xs text-muted-foreground">신고자 {r.reporter.name}</span>
              <span className="min-w-0 flex-1 truncate">{r.reason}</span>
              <Badge variant={r.status === "OPEN" ? "destructive" : "outline"}>
                {r.status === "OPEN" ? "대기" : r.status === "RESOLVED" ? "처리완료" : "기각"}
              </Badge>
            </Row>
          ))
        )}
      </Section>

      <Section title="관리자 작업 내역">
        {adminActions.length === 0 ? (
          <Empty />
        ) : (
          adminActions.map((a) => {
            const reason = getAdminActionReason(a.metadata);
            return (
              <Row key={a.id}>
                <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {a.createdAt.toLocaleString("ko-KR")}
                </span>
                <span className="font-medium">{ADMIN_ACTION_LABEL[a.action] ?? a.action}</span>
                {reason && <span className="text-xs text-muted-foreground">사유: {reason}</span>}
                <span className="text-xs text-muted-foreground">{a.actor.name}</span>
              </Row>
            );
          })
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
