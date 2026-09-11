"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackRow } from "./track-row";
import type { Track, User } from "@prisma/client";

type TrackWithCreator = Track & { creator: Pick<User, "name" | "email"> };

// 개별 행 액션(TrackRow)은 그대로 두고, 체크박스 + 일괄 숨김/해제만 이 래퍼에서 관리 —
// 각 트랙마다 기존 PATCH 엔드포인트를 병렬 호출하므로(전용 벌크 API 없음) 감사 로그에도
// 선택한 개수만큼 개별 항목으로 정확히 남는다.
export function TrackList({ tracks }: { tracks: TrackWithCreator[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === tracks.length ? new Set() : new Set(tracks.map((t) => t.id))));
  }

  async function bulkSet(removedByAdmin: boolean) {
    setBusy(true);
    setError(null);
    try {
      const results = await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/admin/tracks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              removedByAdmin,
              ...(removedByAdmin && reason.trim() && { reason: reason.trim() }),
            }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) throw new Error(`${failed}건 처리에 실패했습니다`);
      setSelected(new Set());
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={tracks.length > 0 && selected.size === tracks.length}
            onChange={toggleAll}
          />
          전체 선택
        </label>
        {selected.size > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/50 p-2">
            <span className="text-xs font-medium">{selected.size}개 선택됨</span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="숨김 사유 (선택)"
              className="h-7 w-36 text-xs"
            />
            <Button size="sm" disabled={busy} onClick={() => bulkSet(true)}>
              일괄 숨김 처리
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkSet(false)}>
              일괄 숨김 해제
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected(new Set())}>
              선택 해제
            </Button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-2 space-y-2">
        {tracks.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.has(t.id)}
              onChange={() => toggle(t.id)}
              className="shrink-0"
              aria-label={`${t.title} 선택`}
            />
            <div className="min-w-0 flex-1">
              <TrackRow track={t} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
