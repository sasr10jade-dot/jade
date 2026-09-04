"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, comment: comment || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "리뷰 등록에 실패했습니다");
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
      <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setOpen(true)}>
        리뷰 남기기
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border p-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n}점`}
            onClick={() => setRating(n)}
            className={`text-xl ${n <= rating ? "text-primary" : "text-foreground/20"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="후기를 남겨주세요 (선택)"
        className="mt-2 w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        rows={2}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button size="sm" disabled={busy} onClick={submit}>
          {busy ? "등록 중..." : "등록"}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          취소
        </Button>
      </div>
    </div>
  );
}
