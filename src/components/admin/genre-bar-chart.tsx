import type { GenreCount } from "@/lib/admin-stats";

// data는 admin-stats.ts에서 이미 count desc로 정렬되어 들어온다 — 여기선 막대 폭 비율만 계산.
export function GenreBarChart({ data }: { data: GenreCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="mt-3 flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.genre} className="flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 truncate text-muted-foreground" title={d.genre}>
            {d.genre}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-chart-1 transition-[width]"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-medium">{d.count.toLocaleString()}곡</span>
        </div>
      ))}
    </div>
  );
}
