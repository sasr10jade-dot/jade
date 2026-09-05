import Link from "next/link";
import type { Prisma, CommissionStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { displayName } from "@/lib/display-name";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "지원 모집 중",
  MATCHED: "매칭됨",
  DELIVERED: "납품 완료",
  CANCELLED: "취소됨",
  EXPIRED: "마감 지남",
};

const STATUS_ORDER: Record<string, number> = { OPEN: 0, MATCHED: 1, DELIVERED: 2, EXPIRED: 3, CANCELLED: 4 };

// 오버사이트 전용 — 곡 의뢰 전체 흐름(등록→지원→매칭→납품)을 한눈에 보되, 실제 조치는
// 당사자(구매자 취소, 크리에이터 납품)가 하는 것이라 관리자가 여기서 직접 바꾸는
// 값은 없음. 문제가 생겼을 때 어느 단계에서 막혔는지 파악하는 용도.
export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();

  const where: Prisma.CommissionRequestWhereInput = {};
  if (query) {
    where.OR = [{ title: { contains: query } }, { buyer: { name: { contains: query } } }];
  }
  if (status) where.status = status as CommissionStatus;

  const [requests, totalCount] = await Promise.all([
    prisma.commissionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { name: true, nickname: true, displayNickname: true } },
        offers: {
          include: { creator: { select: { name: true, nickname: true, displayNickname: true } } },
        },
        track: { select: { id: true, title: true } },
      },
    }),
    prisma.commissionRequest.count(),
  ]);
  requests.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const hasFilter = !!(query || status);

  return (
    <div>
      <h2 className="text-lg font-semibold">곡 의뢰 관리</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        전체 {totalCount}건{hasFilter ? ` · 검색 결과 ${requests.length}건` : ""} — 등록부터 납품까지 전체 흐름 확인
      </p>

      <form action="/admin/commissions" method="GET" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="의뢰 제목, 구매자 검색"
          className="w-56 rounded-full border border-input bg-transparent px-3.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">상태: 전체</option>
          {Object.entries(STATUS_LABEL).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          검색
        </button>
        {hasFilter && (
          <a href="/admin/commissions" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            초기화
          </a>
        )}
      </form>

      {requests.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">조건에 맞는 의뢰가 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {requests.map((r) => {
            const selected = r.offers.find((o) => o.status === "SELECTED");
            return (
              <Link
                key={r.id}
                href={`/commissions/${r.id}`}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm transition hover:border-primary/50"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    구매자 {displayName(r.buyer)} · 예산 {formatKRW(r.budgetMin)}~{formatKRW(r.budgetMax)} · 지원{" "}
                    {r.offers.length}건 · 마감 {r.deadline.toLocaleDateString("ko-KR")}
                  </span>
                  {selected && (
                    <span className="ml-2 text-xs text-primary">→ 선정: {displayName(selected.creator)}</span>
                  )}
                  {r.track && (
                    <span className="ml-2 text-xs text-primary">→ 납품곡: {r.track.title}</span>
                  )}
                </div>
                <Badge variant={r.status === "OPEN" || r.status === "MATCHED" ? "default" : "outline"}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
