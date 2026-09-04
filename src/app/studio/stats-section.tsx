import { Card, CardContent } from "@/components/ui/card";
import { formatKRW } from "@/lib/format";
import { MiniBarChart, type DailyPoint } from "@/components/mini-bar-chart";

// Studio 상단 통계 요약 — 재생수/좋아요/매출 총계 카드 + 최근 14일 재생·매출 추이 미니 바차트.
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
