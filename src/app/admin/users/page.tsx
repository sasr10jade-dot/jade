import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRow } from "./user-row";

const ROLE_OPTIONS = ["CREATOR", "PERFORMER", "BUYER", "ADMIN"] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; suspended?: string }>;
}) {
  const { q, role, suspended } = await searchParams;
  const query = (q ?? "").trim();

  const where: Prisma.UserWhereInput = {};
  if (query) {
    where.OR = [{ name: { contains: query } }, { email: { contains: query } }];
  }
  if (role) where.role = role as (typeof ROLE_OPTIONS)[number];
  if (suspended === "true") where.suspended = true;

  const [session, users, totalCount] = await Promise.all([
    auth(),
    prisma.user.findMany({ where, orderBy: { createdAt: "asc" } }),
    prisma.user.count(),
  ]);

  const hasFilter = !!(query || role || suspended);

  return (
    <div>
      <h2 className="text-lg font-semibold">사용자 관리</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        전체 {totalCount}명{hasFilter ? ` · 검색 결과 ${users.length}건` : ""} — 역할 변경 및 계정 정지
      </p>

      <form action="/admin/users" method="GET" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="이름, 이메일 검색"
          className="w-56 rounded-full border border-input bg-transparent px-3.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          name="role"
          defaultValue={role ?? ""}
          className="rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">역할: 전체</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          name="suspended"
          defaultValue={suspended ?? ""}
          className="rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">상태: 전체</option>
          <option value="true">정지된 계정만</option>
        </select>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          검색
        </button>
        {hasFilter && (
          <a href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            초기화
          </a>
        )}
      </form>

      {users.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">조건에 맞는 사용자가 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {users.map((u) => (
            <UserRow key={u.id} user={u} isSelf={u.id === session!.user.id} />
          ))}
        </div>
      )}
    </div>
  );
}
