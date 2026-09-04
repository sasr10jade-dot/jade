export type DailyPoint = { date: string; value: number };

// Studio(Creator 통계)와 Admin(플랫폼 통계) 양쪽이 공유하는 순수 CSS 막대 차트 —
// 외부 차트 라이브러리 없이 높이 %로 구현, 앱 전체의 DIY 비주얼 톤과 통일.
export function MiniBarChart({ points, formatValue }: { points: DailyPoint[]; formatValue: (v: number) => string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="mt-3 flex h-20 items-end gap-1" role="img" aria-label="최근 14일 추이 막대 그래프">
      {points.map((p) => {
        const label = new Date(p.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
        return (
          <div key={p.date} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
              style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-sm group-hover:block">
              {label} · {formatValue(p.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
