import { redirect } from "next/navigation";
import { TrackTile } from "@/components/track-tile";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TRACK_INCLUDE = {
  licenses: { where: { type: "EXCLUSIVE" as const } },
  _count: { select: { guides: true } },
  creator: { select: { name: true, nickname: true, displayNickname: true } },
};

export default async function LikesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const likes = await prisma.like.findMany({
    where: { userId: session.user.id, track: { removedByAdmin: false } },
    orderBy: { createdAt: "desc" },
    include: { track: { include: TRACK_INCLUDE } },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">좋아요한 트랙</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        하트를 누른 트랙 모음 — 최근에 누른 순서대로 보여줍니다.
      </p>

      {likes.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          아직 좋아요한 트랙이 없습니다. 트랙 상세 페이지의 하트 버튼을 눌러보세요.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {likes.map((l) => (
            <TrackTile
              key={l.id}
              track={{ ...l.track, guideCount: l.track._count.guides }}
              className="w-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}
