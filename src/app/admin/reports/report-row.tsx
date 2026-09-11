"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ReportRow({
  id,
  reporterName,
  trackTitle,
  trackId,
  reason,
  createdAt,
}: {
  id: string;
  reporterName: string;
  trackTitle: string;
  trackId: string;
  reason: string;
  createdAt: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(status: "RESOLVED" | "DISMISSED") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/admin/tracks/${trackId}`} className="font-medium hover:underline">
            {trackTitle}
          </Link>
          <span className="ml-2 text-xs text-muted-foreground">신고자 {reporterName}</span>
          <span className="ml-2 text-xs text-muted-foreground">{createdAt}</span>
        </div>
        <Button size="sm" disabled={busy} onClick={() => resolve("RESOLVED")}>
          처리 완료
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve("DISMISSED")}>
          기각
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">사유: {reason}</p>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
