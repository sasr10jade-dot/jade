"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReplyForm({ ticketId, isAdmin }: { ticketId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!message.trim()) {
      setError("내용을 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "답변 등록에 실패했습니다");
      setMessage("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <Textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={isAdmin ? "답변을 입력해주세요" : "추가로 남길 내용이 있다면 입력해주세요"}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      <Button size="sm" className="mt-2" disabled={busy} onClick={submit}>
        {busy ? "등록 중..." : isAdmin ? "답변 등록" : "답장 보내기"}
      </Button>
    </div>
  );
}
