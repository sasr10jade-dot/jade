import type { DailyPoint } from "@/components/mini-bar-chart";

const WIDTH = 300;
const HEIGHT = 80;
const PAD_Y = 6;

// text-chart-1/stroke-chart-1 같은 완전한 클래스 문자열이어야 Tailwind가 생성한다 —
// 그래서 색상별로 미리 조합해둔 리터럴을 룩업 테이블로 둔다 (동적 템플릿 리터럴 금지).
const COLOR_CLASSES = {
  "chart-1": { text: "text-chart-1", stroke: "stroke-chart-1", dot: "bg-chart-1" },
  "chart-2": { text: "text-chart-2", stroke: "stroke-chart-2", dot: "bg-chart-2" },
} as const;

type ChartColor = keyof typeof COLOR_CLASSES;

// MiniBarChart(Studio와 공유하는 막대형)와 별개로, Admin 대시보드 추이 카드 전용 —
// 선/영역 채우기 + 합계·일평균 요약 + 시작/끝 날짜 축 라벨까지 보여주는 좀 더 "그래프"에
// 가까운 시각화. 호버 툴팁은 SVG 위에 격자로 겹친 투명 셀에 CSS group-hover로 구현
// (MiniBarChart와 동일한 패턴 — 별도 JS 마우스 트래킹 불필요).
export function TrendAreaChart({
  points,
  formatValue,
  color,
}: {
  points: DailyPoint[];
  formatValue: (v: number) => string;
  color: ChartColor;
}) {
  const classes = COLOR_CLASSES[color];
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const stepX = n > 1 ? WIDTH / (n - 1) : 0;
  const coords = points.map((p, i) => ({
    ...p,
    x: i * stepX,
    y: PAD_Y + (HEIGHT - PAD_Y * 2) * (1 - p.value / max),
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

  const total = points.reduce((sum, p) => sum + p.value, 0);
  const avg = n > 0 ? total / n : 0;
  const gradientId = `trend-gradient-${color}`;

  const firstLabel = points[0]
    ? new Date(points[0].date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
    : "";
  const lastLabel = points[n - 1]
    ? new Date(points[n - 1].date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
    : "";

  return (
    <div className="mt-3">
      <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
        <span>
          합계 <span className="font-semibold text-foreground">{formatValue(total)}</span>
        </span>
        <span>
          일평균 <span className="font-semibold text-foreground">{formatValue(Math.round(avg))}</span>
        </span>
      </div>

      <div className="relative mt-2 h-24">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className={classes.text} stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" className={classes.text} stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            className={classes.stroke}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="absolute inset-0 flex">
          {coords.map((c) => {
            const label = new Date(c.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
            return (
              <div key={c.date} className="group relative flex-1">
                <div
                  className={`absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition group-hover:opacity-100 ${classes.dot}`}
                  style={{ top: `${(c.y / HEIGHT) * 100}%` }}
                />
                <div
                  className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-sm group-hover:block"
                  style={{ top: `${(c.y / HEIGHT) * 100}%` }}
                >
                  {label} · {formatValue(c.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>
    </div>
  );
}
