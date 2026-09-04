import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TrackTile, type TileTrack } from "@/components/track-tile";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/display-name";
import type { Prisma } from "@prisma/client";

const TRACK_INCLUDE = {
  licenses: { where: { type: "EXCLUSIVE" as const } },
  _count: { select: { guides: true, likes: true } },
  creator: { select: { name: true, nickname: true, displayNickname: true } },
};

const SORT_OPTIONS = [
  { value: "popular", label: "인기순" },
  { value: "liked", label: "좋아요순" },
  { value: "newest", label: "최신순" },
] as const;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; mood?: string; bpmMin?: string; bpmMax?: string; sort?: string }>;
}) {
  const { genre, mood, bpmMin, bpmMax, sort } = await searchParams;
  const hasFilter = !!(genre || mood || bpmMin || bpmMax || (sort && sort !== "popular"));

  const topCreators = hasFilter ? [] : await getTopCreators();

  const [genreRows, moodRows] = await Promise.all([
    prisma.track.findMany({
      where: { removedByAdmin: false, genre: { not: null } },
      distinct: ["genre"],
      select: { genre: true },
      orderBy: { genre: "asc" },
    }),
    prisma.track.findMany({
      where: { removedByAdmin: false, mood: { not: null } },
      distinct: ["mood"],
      select: { mood: true },
      orderBy: { mood: "asc" },
    }),
  ]);
  const genreOptions = genreRows.map((r) => r.genre!).filter(Boolean);
  const moodOptions = moodRows.map((r) => r.mood!).filter(Boolean);

  const where: Prisma.TrackWhereInput = { removedByAdmin: false };
  if (genre) where.genre = genre;
  if (mood) where.mood = mood;
  if (bpmMin || bpmMax) {
    where.bpm = {
      ...(bpmMin ? { gte: Number(bpmMin) } : {}),
      ...(bpmMax ? { lte: Number(bpmMax) } : {}),
    };
  }
  const orderBy: Prisma.TrackOrderByWithRelationInput[] =
    sort === "newest"
      ? [{ createdAt: "desc" }]
      : sort === "liked"
        ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
        : [{ playCount: "desc" }, { createdAt: "desc" }];

  const tracks = await prisma.track.findMany({ where, orderBy, include: TRACK_INCLUDE });
  const withGuideCount = tracks.map((t) => ({ ...t, guideCount: t._count.guides }));

  const featured = withGuideCount.slice(0, 3);
  const popular = withGuideCount.slice(0, 10);

  const mostLiked = hasFilter
    ? []
    : await prisma.track.findMany({
        where: { removedByAdmin: false, likes: { some: {} } },
        orderBy: { likes: { _count: "desc" } },
        take: 10,
        include: TRACK_INCLUDE,
      }).then((rows) => rows.map((t) => ({ ...t, guideCount: t._count.guides })));

  // 장르가 입력된 트랙만 장르별 가로 스크롤 섹션으로 묶는다 (미입력 트랙은 아래 전체 그리드에서 확인).
  const genreGroups = new Map<string, TileTrack[]>();
  for (const t of withGuideCount) {
    if (!t.genre) continue;
    const list = genreGroups.get(t.genre) ?? [];
    list.push(t);
    genreGroups.set(t.genre, list);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        필터(장르, 무드, BPM) → 가이드 포함 풀버전 청취
      </p>

      <form action="/discover" method="GET" className="mt-6 flex flex-wrap items-center gap-2">
        <FilterSelect name="genre" defaultValue={genre ?? ""} label="장르: 전체" options={genreOptions} />
        <FilterSelect name="mood" defaultValue={mood ?? ""} label="무드: 전체" options={moodOptions} />
        <input
          type="number"
          name="bpmMin"
          defaultValue={bpmMin ?? ""}
          placeholder="BPM 최소"
          className="w-24 rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <input
          type="number"
          name="bpmMax"
          defaultValue={bpmMax ?? ""}
          placeholder="BPM 최대"
          className="w-24 rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          name="sort"
          defaultValue={sort ?? "popular"}
          className="rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              정렬: {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          적용
        </button>
        {hasFilter && (
          <a href="/discover" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            필터 초기화
          </a>
        )}
      </form>

      {tracks.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {hasFilter
            ? "조건에 맞는 트랙이 없습니다."
            : "아직 등록된 트랙이 없습니다. Creator로 로그인해 업로드해보세요."}
        </p>
      ) : hasFilter ? (
        <>
          <p className="mt-6 text-sm text-muted-foreground">검색 결과 {tracks.length}건</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {withGuideCount.map((t) => (
              <TrackTile key={t.id} track={t} className="w-full" queue={withGuideCount} />
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-10 text-xl font-bold tracking-tight">✨ 지금 주목할 트랙</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {featured.map((t) => (
              <TrackTile key={t.id} track={t} className="w-full" queue={featured} />
            ))}
          </div>

          {topCreators.length > 0 && <CreatorRow creators={topCreators} />}

          <TrackRow title="🔥 인기 급상승" tracks={popular} />

          {mostLiked.length > 0 && <TrackRow title="❤️ 좋아요 많은 트랙" tracks={mostLiked} />}

          {[...genreGroups.entries()].map(([g, list]) => (
            <TrackRow key={g} title={`🎵 ${g}`} tracks={list} />
          ))}

          <h2 className="mt-10 text-xl font-bold tracking-tight">전체 트랙</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {withGuideCount.map((t) => (
              <TrackTile key={t.id} track={t} className="w-full" queue={withGuideCount} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type TopCreator = {
  id: string;
  name: string;
  nickname: string | null;
  displayNickname: boolean;
  isSeedCreator: boolean;
  followerCount: number;
  totalPlays: number;
  trackCount: number;
};

// 발견성/신뢰 요소 — 누적 재생수 기준 상위 크리에이터. 팔로워 수는 서비스 초기라
// 대부분 0에 가까워 변별력이 없으므로(신규 설치 기준), 데이터가 훨씬 풍부한 누적
// 재생수를 랭킹 지표로 쓰고 팔로워 수는 카드에 보조 정보로만 노출.
async function getTopCreators(): Promise<TopCreator[]> {
  const creators = await prisma.user.findMany({
    where: { role: "CREATOR", tracksCreated: { some: { removedByAdmin: false } } },
    select: {
      id: true,
      name: true,
      nickname: true,
      displayNickname: true,
      isSeedCreator: true,
      _count: { select: { followers: true } },
      tracksCreated: { where: { removedByAdmin: false }, select: { playCount: true } },
    },
  });

  return creators
    .map((c) => ({
      id: c.id,
      name: c.name,
      nickname: c.nickname,
      displayNickname: c.displayNickname,
      isSeedCreator: c.isSeedCreator,
      followerCount: c._count.followers,
      totalPlays: c.tracksCreated.reduce((sum, t) => sum + t.playCount, 0),
      trackCount: c.tracksCreated.length,
    }))
    .sort((a, b) => b.totalPlays - a.totalPlays || b.followerCount - a.followerCount)
    .slice(0, 8);
}

function CreatorRow({ creators }: { creators: TopCreator[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">🏆 인기 크리에이터</h2>
      <div className="mt-4 -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-5 pb-2 scrollbar-hide sm:mx-0 sm:px-0">
        {creators.map((c) => (
          <Link
            key={c.id}
            href={`/u/${c.id}`}
            className="flex w-40 shrink-0 snap-start flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/50"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {displayName(c).slice(0, 1)}
            </div>
            <span className="truncate text-sm font-semibold">{displayName(c)}</span>
            {c.isSeedCreator && (
              <Badge variant="secondary" className="text-[10px]">
                초기 크리에이터
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">
              재생 {c.totalPlays.toLocaleString()} · 팔로워 {c.followerCount.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FilterSelect({
  name,
  defaultValue,
  label,
  options,
}: {
  name: string;
  defaultValue: string;
  label: string;
  options: string[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function TrackRow({ title, tracks }: { title: string; tracks: TileTrack[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 scrollbar-hide sm:mx-0 sm:px-0">
        {tracks.map((t) => (
          <TrackTile key={t.id} track={t} className="w-52 shrink-0 snap-start sm:w-56" queue={tracks} />
        ))}
      </div>
    </section>
  );
}
