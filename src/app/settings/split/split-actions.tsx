"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SplitActions({
  splitId,
  creatorShare,
}: {
  splitId: string;
  creatorShare: number;
}) {
  const router = useRouter();
  const [counterOpen, setCounterOpen] = useState(false);
  const [creatorInput, setCreatorInput] = useState(String(Math.round(creatorShare)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatorNum = Number(creatorInput);
  const performerNum = Number.isFinite(creatorNum) ? 100 - creatorNum : NaN;

  async function respond(body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/splits/${splitId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "처리에 실패했습니다");
      }
      router.refresh();
      setCounterOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  if (counterOpen) {
    return (
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="w-24">
          <Label>Creator %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={creatorInput}
            onChange={(e) => setCreatorInput(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="w-24">
          <Label>Performer %</Label>
          <Input value={Number.isFinite(performerNum) ? performerNum : ""} disabled className="mt-1.5" />
        </div>
        <Button
          disabled={busy}
          onClick={() =>
            respond({ action: "COUNTER", creatorShare: creatorNum, performerShare: performerNum })
          }
        >
          {busy ? "전송 중..." : "역제안 보내기"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setCounterOpen(false)}>
          취소
        </Button>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button disabled={busy} onClick={() => respond({ action: "ACCEPT" })}>
        {busy ? "처리 중..." : "수락"}
      </Button>
      <Button variant="outline" disabled={busy} onClick={() => setCounterOpen(true)}>
        역제안
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
