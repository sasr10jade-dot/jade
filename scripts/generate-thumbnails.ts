import { PrismaClient } from "@prisma/client";
import { generateFallbackThumbnail } from "../src/lib/generate-thumbnail";

// 백필용 1회성 스크립트 — 신규 트랙 생성 시점의 자동 생성은
// src/lib/generate-thumbnail.ts를 /api/tracks, /api/commissions/[id]/deliver에서 직접 호출.
async function main() {
  const prisma = new PrismaClient();

  const tracks = await prisma.track.findMany({
    where: { thumbnailUrl: null },
    select: { id: true, title: true },
  });

  console.log(`${tracks.length}개 트랙에 썸네일이 없습니다. 생성을 시작합니다...`);

  for (const track of tracks) {
    const url = generateFallbackThumbnail(track.id, track.title);
    await prisma.track.update({ where: { id: track.id }, data: { thumbnailUrl: url } });
    console.log(`  ✓ ${track.title} -> ${url}`);
  }

  console.log("완료.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
