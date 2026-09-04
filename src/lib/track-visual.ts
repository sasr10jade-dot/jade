// 실제 앨범 아트가 없는 트랙의 장식용 비주얼(그라데이션 각도 + 웨이브폼 실루엣) —
// 서버 컴포넌트에서도 항상 같은 트랙에 같은 비주얼이 나오도록 Math.random() 대신
// id 기반 결정론적 해시를 사용. Discover/Home/트랙 타일 전체가 공유.
export function hashSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function decorativeBars(seed: number, count: number) {
  const bars: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    bars.push(20 + (s % 80));
  }
  return bars;
}

export function gradientAngle(seed: number) {
  return seed % 360;
}
