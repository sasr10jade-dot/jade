"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [adminTier, setAdminTier] = useState<"OPERATOR" | "SUPER">("OPERATOR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, adminTier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "처리에 실패했습니다");
      }
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="기존 사용자 이메일"
        className="w-64 rounded-full border border-input bg-transparent px-3.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Select value={adminTier} onValueChange={(v) => setAdminTier(v as "OPERATOR" | "SUPER")}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OPERATOR">운영자</SelectItem>
          <SelectItem value="SUPER">최고관리자</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={busy}>
        권한 부여
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}
