"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKRW } from "@/lib/format";
import type { CashTopupRequest, User } from "@prisma/client";

type RequestWithUser = CashTopupRequest & { user: Pick<User, "name" | "email"> };

export function DepositRequestRow({ request }: { request: RequestWithUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: "confirm" | "reject", reasonText?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deposits/${request.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { reason: reasonText } : {}),
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
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <span className="font-semibold">입금자명: {request.depositorName}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {request.user.name} · {request.user.email}
        </span>
        <div className="text-xs text-muted-foreground">
          신청 {request.requestedAt.toLocaleString("ko-KR")}
        </div>
      </div>
      <span className="font-semibold">{formatKRW(request.amount)}</span>

      {askingReason ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="거절 사유 (예: 입금자명 불일치, 미입금)"
            className="h-8 w-56 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") act("reject", reason.trim() || undefined);
              if (e.key === "Escape") setAskingReason(false);
            }}
          />
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("reject", reason.trim() || undefined)}>
            확인
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAskingReason(false)}>
            취소
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Button size="sm" disabled={busy} onClick={() => act("confirm")}>
            입금 확인
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setAskingReason(true)}>
            거절
          </Button>
        </div>
      )}

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
