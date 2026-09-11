import { prisma } from "@/lib/prisma";
import { ReportRow } from "./report-row";

export default async function AdminReportsPage() {
  const [open, recentResolved] = await Promise.all([
    prisma.report.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { reporter: { select: { name: true } }, track: { select: { id: true, title: true } } },
    }),
    prisma.report.findMany({
      where: { status: { not: "OPEN" } },
      orderBy: { resolvedAt: "desc" },
      take: 20,
      include: { reporter: { select: { name: true } }, track: { select: { id: true, title: true } } },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold">신고 대기</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 {open.length}건 — 트랙 숨김이 필요하면 관리 상세 페이지에서 별도로 처리합니다
        </p>
        {open.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">대기 중인 신고가 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {open.map((r) => (
              <ReportRow
                key={r.id}
                id={r.id}
                reporterName={r.reporter.name}
                trackTitle={r.track.title}
                trackId={r.track.id}
                reason={r.reason}
                createdAt={r.createdAt.toLocaleString("ko-KR")}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold">최근 처리 완료</h2>
        {recentResolved.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">처리된 신고가 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentResolved.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{r.track.title}</span>
                <span className="text-xs text-muted-foreground">신고자 {r.reporter.name}</span>
                <span className="text-xs text-muted-foreground">
                  {r.status === "RESOLVED" ? "처리 완료" : "기각"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
