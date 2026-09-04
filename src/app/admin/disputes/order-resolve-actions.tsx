"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function OrderResolveActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(resolution: "SETTLE" | "REFUND") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
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
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={busy} onClick={() => resolve("SETTLE")}>
        정산 진행
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve("REFUND")}>
        환불 처리
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
