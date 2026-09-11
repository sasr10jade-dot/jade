"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminTier, User } from "@prisma/client";

export function AdminRow({
  admin,
  isSelf,
  isLastSuper,
}: {
  admin: User;
  isSelf: boolean;
  isLastSuper: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const disableDemote = isSelf || (isLastSuper && admin.adminTier === "SUPER");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <span className="font-medium">{admin.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{admin.email}</span>
        {isSelf && (
          <Badge variant="outline" className="ml-2 text-xs">
            나
          </Badge>
        )}
        <Badge variant="secondary" className="ml-2 text-xs">
          {admin.role}
        </Badge>
      </div>

      <Select
        value={admin.adminTier ?? undefined}
        disabled={disableDemote || busy}
        onValueChange={(v) => v && update({ adminTier: v as AdminTier })}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OPERATOR">운영자</SelectItem>
          <SelectItem value="SUPER">최고관리자</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="destructive"
        size="sm"
        disabled={disableDemote || busy}
        onClick={() => update({ revoke: true })}
      >
        권한 해제
      </Button>

      {isLastSuper && admin.adminTier === "SUPER" && !isSelf && (
        <span className="text-xs text-muted-foreground">마지막 최고관리자는 변경할 수 없습니다</span>
      )}

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
