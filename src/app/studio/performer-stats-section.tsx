import { Card, CardContent } from "@/components/ui/card";
import { formatKRW } from "@/lib/format";
import { MiniBarChart, type DailyPoint } from "@/components/mini-bar-chart";

export function PerformerStatsSection({
  totalGuides,
  selectedGuides,
  totalEarnings,
  submissions,
  earnings,
}: {
  totalGuides: number;
  selectedGuides: number;
  totalEarnings: number;
  submissions: DailyPoint[];
  earnings: DailyPoint[];
}) {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">제출한 가이드</p>
            <p className="mt-1 text-xl font-bold">{totalGuides.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">채택된 콜라보</p>
            <p className="mt-1 text-xl font-bold">{selectedGuides.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">누적 정산 수익</p>
            <p className="mt-1 text-xl font-bold">{formatKRW(totalEarnings)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">가이드 제출 추이 (최근 14일)</p>
            <MiniBarChart points={submissions} formatValue={(v) => `${v}건`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">정산 수익 추이 (최근 14일)</p>
            <MiniBarChart points={earnings} formatValue={formatKRW} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
