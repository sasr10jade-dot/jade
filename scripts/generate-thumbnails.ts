import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { hashSeed, decorativeBars, gradientAngle } from "../src/lib/track-visual";

// 썸네일이 비어있는(thumbnailUrl null) 트랙에, 카드 UI가 이미 쓰는 그라데이션+웨이브 바
// 폴백과 동일한 룩을 SVG로 구워서 실제 파일로 등록 — 목록/공유 링크 등 <img> 태그를
// 직접 렌더링하는 곳에서도 항상 썸네일이 있는 것처럼 보이도록.
const OUT_DIR = join(process.cwd(), "public", "uploads", "thumbnails");

// globals.css --accent / --secondary / --primary — SVG는 <img>로 로드되는 별도 문서라
// CSS 커스텀 프로퍼티를 상속받지 못하므로 실제 테마 색상을 그대로 하드코딩.
const ACCENT = "#1f2a0d";
const SECONDARY = "#1a1a1a";
const PRIMARY = "#7fff00";

function svgFor(id: string, title: string) {
  const seed = hashSeed(id);
  const angle = gradientAngle(seed);
  const bars = decorativeBars(seed, 24);
  const barWidth = 512 / bars.length;
  const barsMarkup = bars
    .map((h, i) => {
      const height = (h / 100) * 160;
      const x = i * barWidth + barWidth * 0.15;
      const w = barWidth * 0.7;
      const y = 512 - height;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${height.toFixed(1)}" rx="${(w / 2).toFixed(1)}" fill="${PRIMARY}" fill-opacity="0.7" />`;
    })
    .join("");
  const initial = title.trim().slice(0, 1) || "?";
  const rad = (angle * Math.PI) / 180;
  const x1 = (50 - Math.cos(rad) * 50).toFixed(1);
  const y1 = (50 - Math.sin(rad) * 50).toFixed(1);
  const x2 = (50 + Math.cos(rad) * 50).toFixed(1);
  const y2 = (50 + Math.sin(rad) * 50).toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${ACCENT}" />
      <stop offset="100%" stop-color="${SECONDARY}" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)" />
  <text x="32" y="120" font-family="system-ui, sans-serif" font-size="96" font-weight="900" fill="${PRIMARY}" fill-opacity="0.12">${initial}</text>
  <g>${barsMarkup}</g>
</svg>`;
}

async function main() {
  const prisma = new PrismaClient();
  mkdirSync(OUT_DIR, { recursive: true });

  const tracks = await prisma.track.findMany({
    where: { thumbnailUrl: null },
    select: { id: true, title: true },
  });

  console.log(`${tracks.length}개 트랙에 썸네일이 없습니다. 생성을 시작합니다...`);

  for (const track of tracks) {
    const svg = svgFor(track.id, track.title);
    const filename = `${track.id}.svg`;
    writeFileSync(join(OUT_DIR, filename), svg, "utf-8");
    await prisma.track.update({
      where: { id: track.id },
      data: { thumbnailUrl: `/uploads/thumbnails/${filename}` },
    });
    console.log(`  ✓ ${track.title} -> /uploads/thumbnails/${filename}`);
  }

  console.log("완료.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
