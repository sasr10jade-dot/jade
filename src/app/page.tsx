import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrackRow } from "@/components/home/track-row";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { hashSeed, decorativeBars, gradientAngle } from "@/lib/track-visual";

const TRACK_SELECT = {
  licenses: { where: { type: "EXCLUSIVE" as const } },
  _count: { select: { guides: true } },
  creator: { select: { name: true, nickname: true, displayNickname: true } },
};

export default async function Home() {
  const session = await auth();

  const [popular, newest, followedTracks] = await Promise.all([
    prisma.track.findMany({
      where: { removedByAdmin: false },
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: TRACK_SELECT,
    }),
    prisma.track.findMany({
      where: { removedByAdmin: false },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: TRACK_SELECT,
    }),
    session?.user
      ? prisma.track.findMany({
          where: {
            removedByAdmin: false,
            creator: { followers: { some: { followerId: session.user.id } } },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: TRACK_SELECT,
        })
      : Promise.resolve([]),
  ]);

  const hero = popular[0];
  const heroSeed = hero ? hashSeed(hero.id) : 0;
  const heroBars = hero ? decorativeBars(heroSeed, 40) : [];
  const heroPrice = hero?.licenses[0]?.price;

  return (
    <div>
      {/* 히어로 — 인기 1위 트랙을 큰 배너로. 트랙이 하나도 없으면 기존 소개 문구로 폴백. */}
      <section className="relative overflow-hidden border-b border-border">
        {hero ? (
          <div
            className="relative flex min-h-[344px] flex-col justify-end px-5 py-16 sm:px-10"
            style={
              hero.thumbnailUrl
                ? undefined
                : { background: `linear-gradient(${gradientAngle(heroSeed)}deg, var(--accent), var(--secondary))` }
            }
          >
            {hero.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.thumbnailUrl}
                alt={hero.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
            {!hero.thumbnailUrl && (
              <div className="absolute inset-x-0 bottom-0 flex h-32 items-end gap-[3px] px-5 opacity-30 sm:px-10">
                {heroBars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-full bg-primary" style={{ height: `${h}%` }} />
                ))}
              </div>
            )}
            <div className="relative mx-auto w-full max-w-6xl">
              <p className="text-sm font-medium text-primary">🔥 지금 가장 많이 재생된 트랙</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                {hero.title}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {displayName(hero.creator)} · {hero.playCount.toLocaleString()}회 재생
                {heroPrice ? ` · ${formatKRW(heroPrice)}부터` : ""}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/track/${hero.id}`}>
                  <Button size="lg">지금 듣기 →</Button>
                </Link>
                <Link href="/discover">
                  <Button size="lg" variant="outline">
                    Discover 둘러보기
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-5 py-24 text-center">
            <h1 className="text-4xl font-bold tracking-tight">소리를 잇는 다리.</h1>
            <p className="mt-4 text-muted-foreground">
              작곡가와 보컬을 연결하고, 구매와 저작권을 하나의 플로우로 관리하는 음악 마켓플레이스.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/discover">
                <Button size="lg">Discover 둘러보기</Button>
              </Link>
              <Link href="/upload">
                <Button size="lg" variant="outline">
                  트랙 업로드
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {followedTracks.length > 0 && (
        <TrackRow title="💚 팔로우 중인 크리에이터의 신곡" tracks={followedTracks} viewAllHref="/discover" reverse={false} />
      )}
      {popular.length > 0 && (
        <TrackRow title="🔥 인기 급상승" tracks={popular} viewAllHref="/discover" reverse={true} />
      )}
      {newest.length > 0 && (
        <TrackRow title="🆕 신규 업로드" tracks={newest} viewAllHref="/discover" reverse={false} />
      )}
    </div>
  );
}
