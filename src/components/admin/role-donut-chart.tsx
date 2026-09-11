import type { RoleBreakdown } from "@/lib/admin-stats";

const ROLE_LABEL: Record<string, string> = {
  CREATOR: "Creator",
  PERFORMER: "Performer",
  BUYER: "Buyer",
  ADMIN: "Admin",
};

// stroke-chart-1..5, bg-chart-1..5 클래스 문자열이 소스에 그대로 있어야 Tailwind가
// 생성한다 — 인덱스로 조합한 동적 클래스명(`stroke-${x}`)은 스캔되지 않아 스타일이
// 안 먹는다.
const SEGMENT_CLASSES = [
  { stroke: "stroke-chart-1", dot: "bg-chart-1" },
  { stroke: "stroke-chart-2", dot: "bg-chart-2" },
  { stroke: "stroke-chart-3", dot: "bg-chart-3" },
  { stroke: "stroke-chart-4", dot: "bg-chart-4" },
  { stroke: "stroke-chart-5", dot: "bg-chart-5" },
];

const RADIUS = 40;
const STROKE_WIDTH = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RoleDonutChart({ data }: { data: RoleBreakdown[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">가입한 유저가 없습니다.</p>;
  }

  // 각 세그먼트의 시작 위치는 앞선 세그먼트들의 누적 비율 — data가 최대 4~5개뿐이라
  // 인덱스별로 slice(0, i)를 다시 합산해도 비용이 없고, 렌더 중 변수 재할당(let 누적합)을
  // 피할 수 있다.
  const segments = data.map((d, i) => {
    const priorCount = data.slice(0, i).reduce((sum, x) => sum + x.count, 0);
    const fraction = d.count / total;
    const dash = fraction * CIRCUMFERENCE;
    const offset = -(priorCount / total) * CIRCUMFERENCE;
    return { ...d, dash, offset };
  });

  return (
    <div className="mt-3 flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" className="stroke-muted" strokeWidth={STROKE_WIDTH} />
        {segments.map((d, i) => (
          <circle
            key={d.role}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            className={SEGMENT_CLASSES[i % SEGMENT_CLASSES.length].stroke}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${d.dash} ${CIRCUMFERENCE - d.dash}`}
            strokeDashoffset={d.offset}
          />
        ))}
      </svg>
      <ul className="flex flex-col gap-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.role} className="flex items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${SEGMENT_CLASSES[i % SEGMENT_CLASSES.length].dot}`} />
            <span className="text-muted-foreground">{ROLE_LABEL[d.role] ?? d.role}</span>
            <span className="font-medium">{d.count.toLocaleString()}명</span>
            <span className="text-xs text-muted-foreground">
              {Math.round((d.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
