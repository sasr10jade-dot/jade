import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { AdminPagination, ADMIN_PAGE_SIZE, parsePage } from "@/components/admin/admin-pagination";

const ADMIN_ACTION_LABEL: Record<string, string> = {
  USER_UPDATED: "사용자 정보 변경",
  TRACK_VISIBILITY_CHANGED: "트랙 노출 상태 변경",
  ORDER_DISPUTE_RESOLVED: "주문 분쟁 처리",
  SETTLEMENT_PAID: "정산 지급 완료",
};

// 관리자 감사 로그 — 전체 관리자 작업 이력을 시간순으로 조회. offers/splits 관리자 처리는
// 이미 /admin/disputes에서 각자의 로그(PriceOfferLogEntry/SplitLogEntry)를 보여주고
// 있어서 여기 포함하지 않음(중복).
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [entries, totalCount] = await Promise.all([
    prisma.adminActionLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true } } },
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
    }),
    prisma.adminActionLog.count(),
  ]);

  return (
    <div>
      <h2 className="text-lg font-semibold">활동 로그</h2>
      <p className="mt-1 text-sm text-muted-foreground">전체 {totalCount}건 — 관리자 작업 이력</p>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">아직 기록된 작업이 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              <span className="w-40 shrink-0 text-xs text-muted-foreground">
                {e.createdAt.toLocaleString("ko-KR")}
              </span>
              <span className="shrink-0 font-medium">{e.actor.name}</span>
              <Badge variant="outline">{ADMIN_ACTION_LABEL[e.action] ?? e.action}</Badge>
              {targetHref(e.targetType, e.targetId) ? (
                <Link href={targetHref(e.targetType, e.targetId)!} className="text-xs text-primary hover:underline">
                  대상 보기 →
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {e.targetType} #{e.targetId}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <AdminPagination page={page} totalCount={totalCount} baseHref="/admin/activity" searchParams={{}} />
    </div>
  );
}

function targetHref(targetType: string, targetId: string): string | null {
  if (targetType === "USER") return `/admin/users/${targetId}`;
  if (targetType === "TRACK") return `/admin/tracks/${targetId}`;
  return null;
}
