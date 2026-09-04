"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CancelCommissionButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/commissions/${requestId}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "취소에 실패했습니다");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirming(true)}>
        의뢰 취소
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">정말 취소할까요? 지원한 크리에이터에게 알림이 갑니다.</span>
      <Button variant="destructive" size="sm" disabled={busy} onClick={submit}>
        {busy ? "취소 중..." : "네, 취소합니다"}
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
        아니요
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
