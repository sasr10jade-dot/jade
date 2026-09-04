"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OfferForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("올바른 가격을 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/commissions/${requestId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: amount, message: message || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "지원에 실패했습니다");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold">이 의뢰에 지원하기</h3>
      <div className="mt-3 space-y-3">
        <div>
          <Label htmlFor="offer-price">제안 가격 (원)</Label>
          <Input
            id="offer-price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="offer-message">메시지 (선택)</Label>
          <Textarea
            id="offer-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1.5"
            placeholder="포트폴리오 링크, 작업 방식, 예상 작업 기간 등"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <Button size="sm" className="mt-3" disabled={busy} onClick={submit}>
        {busy ? "지원 중..." : "지원하기"}
      </Button>
    </div>
  );
}
