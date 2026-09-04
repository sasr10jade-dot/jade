import { Card, CardContent } from "@/components/ui/card";
import { formatKRW } from "@/lib/format";
import type { DailyPoint } from "@/lib/creator-stats";

function MiniBarChart({ points, formatValue }: { points: DailyPoint[]; formatValue: (v: number) => string }) {
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

// Studio 상단 통계 요약 — 재생수/좋아요/매출 총계 카드 + 최근 14일 재생·매출 추이 미니 바차트.
// 별도 차트 라이브러리 없이 순수 CSS 막대(높이 %)로 구현, 앱 전체의 DIY 비주얼 톤과 통일.
export function StatsSection({
  totalTracks,
  totalPlays,
  totalLikes,
  plays,
  revenue,
}: {
  totalTracks: number;
  totalPlays: number;
  totalLikes: number;
  plays: DailyPoint[];
  revenue: DailyPoint[];
}) {
  const revenue14d = revenue.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">보유 트랙</p>
            <p className="mt-1 text-xl font-bold">{totalTracks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">누적 재생</p>
            <p className="mt-1 text-xl font-bold">{totalPlays.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">누적 좋아요</p>
            <p className="mt-1 text-xl font-bold">{totalLikes.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">최근 14일 매출</p>
            <p className="mt-1 text-xl font-bold">{formatKRW(revenue14d)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">재생 추이 (최근 14일)</p>
            <MiniBarChart points={plays} formatValue={(v) => `${v}회`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">매출 추이 (최근 14일, 정산 기준)</p>
            <MiniBarChart points={revenue} formatValue={formatKRW} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
