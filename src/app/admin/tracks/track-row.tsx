"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Track, User } from "@prisma/client";

type TrackWithCreator = Track & { creator: Pick<User, "name" | "email"> };

export function TrackRow({ track }: { track: TrackWithCreator }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 숨김 처리 시(false→true)만 사유를 물어봄 — 숨김 해제는 사유 불필요, 바로 토글.
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState("");

  async function toggle(nextRemoved: boolean, reasonText?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removedByAdmin: nextRemoved, ...(reasonText && { reason: reasonText }) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "처리에 실패했습니다");
      }
      setAskingReason(false);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <Link href={`/track/${track.id}`} className="font-medium hover:underline">
          {track.title}
        </Link>
        <span className="ml-2 text-xs text-muted-foreground">
          {track.creator.name} · {track.creator.email}
        </span>
      </div>
      <Badge variant="outline">{track.status}</Badge>
      {track.removedByAdmin && <Badge variant="destructive">관리자 숨김</Badge>}
      {track.removedByCreator && <Badge variant="secondary">크리에이터 비공개</Badge>}
      <Link href={`/admin/tracks/${track.id}`} className="text-xs text-muted-foreground hover:underline">
        관리 상세
      </Link>

      {track.removedByAdmin ? (
        <Button variant="default" size="sm" disabled={busy} onClick={() => toggle(false)}>
          숨김 해제
        </Button>
      ) : askingReason ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="숨김 사유 (선택)"
            className="h-8 w-40 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") toggle(true, reason.trim() || undefined);
              if (e.key === "Escape") setAskingReason(false);
            }}
          />
          <Button size="sm" disabled={busy} onClick={() => toggle(true, reason.trim() || undefined)}>
            확인
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAskingReason(false)}>
            취소
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setAskingReason(true)}>
          숨김 처리
        </Button>
      )}

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
