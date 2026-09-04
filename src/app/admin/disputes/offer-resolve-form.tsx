"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OfferResolveForm({ offerId, defaultAmount }: { offerId: string; defaultAmount: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(defaultAmount));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(action: "ACCEPT" | "REJECT") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/offers/${offerId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "ACCEPT" ? { action, amount: Number(amount) } : { action }),
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
      <div className="w-32">
        <Label>확정 금액 (원)</Label>
        <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" />
      </div>
      <Button size="sm" disabled={busy} onClick={() => resolve("ACCEPT")}>
        {busy ? "처리 중..." : "이 금액으로 확정"}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve("REJECT")}>
        거절 처리
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
