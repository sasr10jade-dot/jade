"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReportButton({ trackId, initialReported }: { trackId: string; initialReported: boolean }) {
  const [reported, setReported] = useState(initialReported);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason.trim()) {
      setError("신고 사유를 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, reason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "신고 접수에 실패했습니다");
      }
      setReported(true);
      setAsking(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  if (reported) {
    return (
      <Button variant="outline" size="sm" disabled>
        신고 접수됨
      </Button>
    );
  }

  if (asking) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="신고 사유"
          className="h-8 w-40 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setAsking(false);
          }}
        />
        <Button size="sm" disabled={busy} onClick={submit}>
          제출
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAsking(false)}>
          취소
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setAsking(true)}>
      신고
    </Button>
  );
}
