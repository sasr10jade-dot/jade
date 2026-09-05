"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!subject.trim() || !message.trim()) {
      setError("제목과 내용을 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "문의 등록에 실패했습니다");
      router.push(`/support/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">문의하기</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        결제, 정산, 분쟁, 계정 문제 등 무엇이든 남겨주세요. 관리자가 확인 후 답변합니다.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="ticket-subject">제목</Label>
          <Input id="ticket-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="ticket-message">내용</Label>
          <Textarea
            id="ticket-message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1.5"
            placeholder="어떤 문제가 있었는지, 관련된 트랙/주문/의뢰가 있다면 함께 적어주세요"
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6">
        <Button onClick={submit} disabled={busy}>
          {busy ? "등록 중..." : "문의 등록"}
        </Button>
      </div>
    </div>
  );
}
