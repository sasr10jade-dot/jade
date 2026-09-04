import { TrackTile } from "@/components/track-tile";
import { prisma } from "@/lib/prisma";

const TRACK_INCLUDE = {
  licenses: { where: { type: "EXCLUSIVE" as const } },
  _count: { select: { guides: true } },
  creator: { select: { name: true, nickname: true, displayNickname: true } },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const tracks = query
    ? await prisma.track.findMany({
        where: {
          removedByAdmin: false,
          OR: [
            { title: { contains: query } },
            { genre: { contains: query } },
            { mood: { contains: query } },
            { creator: { name: { contains: query } } },
            { creator: { nickname: { contains: query } } },
          ],
        },
        orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
        include: TRACK_INCLUDE,
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">검색</h1>
      <form action="/search" method="GET" className="mt-4">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="트랙 제목, 크리에이터, 장르로 검색"
          autoFocus
          className="w-full max-w-md rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </form>

      {!query ? (
        <p className="mt-8 text-sm text-muted-foreground">검색어를 입력해주세요.</p>
      ) : tracks.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          &quot;{query}&quot;에 대한 검색 결과가 없습니다.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            &quot;{query}&quot; 검색 결과 {tracks.length}건
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <TrackTile key={t.id} track={{ ...t, guideCount: t._count.guides }} className="w-full" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
