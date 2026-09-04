import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { hashSeed, decorativeBars, gradientAngle } from "@/lib/track-visual";

// globals.css --accent / --secondary / --primary — SVG는 <img>로 로드되는 별도 문서라
// CSS 커스텀 프로퍼티를 상속받지 못하므로 실제 테마 색상을 그대로 하드코딩.
const ACCENT = "#1f2a0d";
const SECONDARY = "#1a1a1a";
const PRIMARY = "#7fff00";
const OUT_DIR = join(process.cwd(), "public", "uploads", "thumbnails");

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

// 크리에이터가 커버 이미지를 직접 올리지 않은 트랙에 카드 UI 그라데이션 폴백과 동일한
// 룩의 SVG를 실제 파일로 구워 등록 — /api/tracks, /api/commissions/[id]/deliver 양쪽에서
// "썸네일 없이 생성 완료된" 트랙이 남지 않도록 생성 시점에 바로 호출한다.
export function generateFallbackThumbnail(trackId: string, title: string): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const filename = `${trackId}.svg`;
  writeFileSync(join(OUT_DIR, filename), svgFor(trackId, title), "utf-8");
  return `/uploads/thumbnails/${filename}`;
}
