import Link from "next/link";
import { cn } from "@/lib/utils";

export const ADMIN_PAGE_SIZE = 20;

export function parsePage(pageParam?: string): number {
  const n = Number(pageParam);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

// 서버 컴포넌트 전용 — 클라이언트 상태 없이 ?page=N 쿼리 파라미터로 페이지를 오간다.
// 기존 검색/필터 파라미터(q, role, status 등)는 그대로 유지한 채 page만 바꿔서 링크를 만든다.
export function AdminPagination({
  page,
  totalCount,
  baseHref,
  searchParams,
  pageSize = ADMIN_PAGE_SIZE,
}: {
  page: number;
  totalCount: number;
  baseHref: string;
  searchParams: Record<string, string | undefined>;
  pageSize?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={cn(
          "rounded-md border px-3 py-1.5",
          prevDisabled ? "pointer-events-none opacity-40" : "hover:bg-muted"
        )}
      >
        이전
      </Link>
      <span className="text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={cn(
          "rounded-md border px-3 py-1.5",
          nextDisabled ? "pointer-events-none opacity-40" : "hover:bg-muted"
        )}
      >
        다음
      </Link>
    </div>
  );
}
