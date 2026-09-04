"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Performer {
  performerId: string;
  name: string;
  splitAsk: number; // performer's requested share, e.g. 20 = 20%
}

export function SplitProposeForm({
  trackId,
  performers,
}: {
  trackId: string;
  performers: Performer[];
}) {
  return (
    <div className="mt-4 space-y-3">
      {performers.map((p) => (
        <PerformerRow key={p.performerId} trackId={trackId} performer={p} />
      ))}
    </div>
  );
}

function PerformerRow({
  trackId,
  performer,
}: {
  trackId: string;
  performer: Performer;
}) {
  const router = useRouter();
  const [creatorShare, setCreatorShare] = useState(
    String(Math.round(100 - performer.splitAsk))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const creatorNum = Number(creatorShare);
  const performerNum = Number.isFinite(creatorNum) ? 100 - creatorNum : NaN;

  async function submit() {
    if (!Number.isFinite(creatorNum) || creatorNum < 0 || creatorNum > 100) {
      setError("Creator 분배율은 0~100 사이 숫자여야 합니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId,
          performerId: performer.performerId,
          creatorShare: creatorNum,
          performerShare: performerNum,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Split 제안에 실패했습니다");
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {performer.name}에게 {creatorNum} / {performerNum} 제안을 보냈습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{performer.name}</p>
        <p className="text-xs text-muted-foreground">
          희망 분배율: Performer {Math.round(performer.splitAsk)}%
        </p>
      </div>
      <div className="w-24">
        <Label htmlFor={`creator-${performer.performerId}`}>Creator %</Label>
        <Input
          id={`creator-${performer.performerId}`}
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
      <Button onClick={submit} disabled={busy}>
        {busy ? "제안 중..." : "Split 제안"}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
