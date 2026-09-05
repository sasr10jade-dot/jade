import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TrackRow } from "./track-row";

export default async function AdminTracksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();

  const where: Prisma.TrackWhereInput = {};
  if (query) {
    where.OR = [{ title: { contains: query } }, { creator: { name: { contains: query } } }];
  }
  if (status === "hidden_admin") where.removedByAdmin = true;
  if (status === "hidden_creator") where.removedByCreator = true;

  const [tracks, totalCount] = await Promise.all([
    prisma.track.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { creator: { select: { name: true, email: true } } },
    }),
    prisma.track.count(),
  ]);
  const hasFilter = !!(query || status);

  return (
    <div>
      <h2 className="text-lg font-semibold">트랙 모더레이션</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        전체 {totalCount}건{hasFilter ? ` · 검색 결과 ${tracks.length}건` : ""} — 숨김 처리된 트랙은
        Discover/구매에서 제외됩니다
      </p>

      <form action="/admin/tracks" method="GET" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="트랙 제목, 크리에이터 검색"
          className="w-56 rounded-full border border-input bg-transparent px-3.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">상태: 전체</option>
          <option value="hidden_admin">관리자 숨김만</option>
          <option value="hidden_creator">크리에이터 비공개만</option>
        </select>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          검색
        </button>
        {hasFilter && (
          <a href="/admin/tracks" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            초기화
          </a>
        )}
      </form>

      {tracks.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">조건에 맞는 트랙이 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {tracks.map((t) => (
            <TrackRow key={t.id} track={t} />
          ))}
        </div>
      )}
    </div>
  );
}
