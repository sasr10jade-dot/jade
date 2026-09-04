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
import type { Role, User } from "@prisma/client";

const ROLES: Role[] = ["CREATOR", "PERFORMER", "BUYER", "ADMIN"];

export function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
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

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <span className="font-medium">{user.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{user.email}</span>
        {isSelf && (
          <Badge variant="outline" className="ml-2 text-xs">
            나
          </Badge>
        )}
        {user.suspended && (
          <Badge variant="destructive" className="ml-2 text-xs">
            정지됨
          </Badge>
        )}
      </div>

      <Select
        value={user.role}
        disabled={isSelf || busy}
        onValueChange={(v) => v && update({ role: v })}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={user.suspended ? "default" : "outline"}
        size="sm"
        disabled={isSelf || busy}
        onClick={() => update({ suspended: !user.suspended })}
      >
        {user.suspended ? "정지 해제" : "계정 정지"}
      </Button>

      <Button
        variant={user.kycVerified ? "default" : "outline"}
        size="sm"
        disabled={busy}
        onClick={() => update({ kycVerified: !user.kycVerified })}
      >
        {user.kycVerified ? "KYC 인증됨" : "KYC 미인증"}
      </Button>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
