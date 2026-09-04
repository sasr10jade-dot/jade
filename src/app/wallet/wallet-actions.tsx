"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopupForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("50000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTopup() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("올바른 금액을 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cash/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "충전에 실패했습니다");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-40">
        <Input
          type="number"
          min={1000}
          step={1000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <Button onClick={handleTopup} disabled={busy}>
        {busy ? "충전 중..." : "충전하기 (모의 결제)"}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function SettlementRequestButton({ eligible }: { eligible: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settlements", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "정산 신청에 실패했습니다");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button onClick={handleRequest} disabled={busy || !eligible} variant="outline">
        {busy ? "신청 중..." : "정산 신청"}
      </Button>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
