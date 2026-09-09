import { TrackRow } from "@/components/home/track-row";
import { HeroBanner } from "@/components/home/hero-banner";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const TRACK_SELECT = {
  licenses: { where: { type: "EXCLUSIVE" as const } },
  _count: { select: { guides: true } },
  creator: { select: { name: true, nickname: true, displayNickname: true } },
};

export default async function Home() {
  const session = await auth();

  const [popular, newest, followedTracks] = await Promise.all([
    prisma.track.findMany({
      where: { removedByAdmin: false, removedByCreator: false },
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: TRACK_SELECT,
    }),
    prisma.track.findMany({
      where: { removedByAdmin: false, removedByCreator: false },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: TRACK_SELECT,
    }),
    session?.user
      ? prisma.track.findMany({
          where: {
            removedByAdmin: false,
            removedByCreator: false,
            creator: { followers: { some: { followerId: session.user.id } } },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: TRACK_SELECT,
        })
      : Promise.resolve([]),
  ]);

  const heroTracks = popular.slice(0, 5);

  return (
    <div>
      <HeroBanner tracks={heroTracks} />

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
