"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserRow } from "./user-row";
import type { User } from "@prisma/client";

// track-list.tsx와 동일한 패턴 — 개별 행 액션(UserRow)은 그대로 두고, 체크박스 +
// 일괄 정지/해제만 이 래퍼에서 관리. 역할 변경/KYC는 사람마다 판단이 달라 일괄 처리
// 대상에서 제외(정지만 트랙 숨김과 성격이 같은 단순 on/off).
export function UserList({ users, selfId }: { users: User[]; selfId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableIds = users.filter((u) => u.id !== selfId).map((u) => u.id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === selectableIds.length ? new Set() : new Set(selectableIds)));
  }

  async function bulkSet(suspended: boolean) {
    setBusy(true);
    setError(null);
    try {
      const results = await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/admin/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ suspended }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) throw new Error(`${failed}건 처리에 실패했습니다`);
      setSelected(new Set());
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
            checked={selectableIds.length > 0 && selected.size === selectableIds.length}
            onChange={toggleAll}
          />
          전체 선택
        </label>
        {selected.size > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/50 p-2">
            <span className="text-xs font-medium">{selected.size}명 선택됨</span>
            <Button size="sm" disabled={busy} onClick={() => bulkSet(true)}>
              일괄 정지
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkSet(false)}>
              일괄 정지 해제
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected(new Set())}>
              선택 해제
            </Button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-2 space-y-2">
        {users.map((u) => {
          const isSelf = u.id === selfId;
          return (
            <div key={u.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
                disabled={isSelf}
                className="shrink-0"
                aria-label={`${u.name} 선택`}
              />
              <div className="min-w-0 flex-1">
                <UserRow user={u} isSelf={isSelf} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
