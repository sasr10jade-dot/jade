import { prisma } from "@/lib/prisma";
import { TrackRow } from "./track-row";

export default async function AdminTracksPage() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold">트랙 모더레이션</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        전체 {tracks.length}건 — 숨김 처리된 트랙은 Discover/구매에서 제외됩니다
      </p>
      <div className="mt-4 space-y-2">
        {tracks.map((t) => (
          <TrackRow key={t.id} track={t} />
        ))}
      </div>
    </div>
  );
}
