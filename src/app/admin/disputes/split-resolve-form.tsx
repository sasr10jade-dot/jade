"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SplitResolveForm({
  splitId,
  defaultCreatorShare,
}: {
  splitId: string;
  defaultCreatorShare: number;
}) {
  const router = useRouter();
  const [creatorShare, setCreatorShare] = useState(String(defaultCreatorShare));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatorNum = Number(creatorShare);
  const performerNum = Number.isFinite(creatorNum) ? 100 - creatorNum : NaN;

  async function resolve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/splits/${splitId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorShare: creatorNum, performerShare: performerNum }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "처리에 실패했습니다");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <div className="w-24">
        <Label>Creator %</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={creatorShare}
          onChange={(e) => setCreatorShare(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div className="w-24">
        <Label>Performer %</Label>
        <Input value={Number.isFinite(performerNum) ? performerNum : ""} disabled className="mt-1.5" />
      </div>
      <Button size="sm" disabled={busy} onClick={resolve}>
        {busy ? "확정 중..." : "관리자 확정"}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
