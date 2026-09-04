"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DisputeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason.trim()) {
      setError("이의 제기 사유를 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "이의 제기에 실패했습니다");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="mt-2 w-full text-destructive" onClick={() => setOpen(true)}>
        이의 제기
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border p-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="이의 제기 사유를 입력해주세요 (예: 설명과 다른 음원, 파일 손상 등)"
        className="w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        rows={3}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="destructive" disabled={busy} onClick={submit}>
          {busy ? "제출 중..." : "이의 제기 제출"}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          취소
        </Button>
      </div>
    </div>
  );
}
