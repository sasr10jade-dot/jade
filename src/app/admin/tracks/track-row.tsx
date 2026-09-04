"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Track, User } from "@prisma/client";

type TrackWithCreator = Track & { creator: Pick<User, "name" | "email"> };

export function TrackRow({ track }: { track: TrackWithCreator }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removedByAdmin: !track.removedByAdmin }),
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
        <Link href={`/track/${track.id}`} className="font-medium hover:underline">
          {track.title}
        </Link>
        <span className="ml-2 text-xs text-muted-foreground">
          {track.creator.name} · {track.creator.email}
        </span>
      </div>
      <Badge variant="outline">{track.status}</Badge>
      {track.removedByAdmin && <Badge variant="destructive">숨김 처리됨</Badge>}
      <Button
        variant={track.removedByAdmin ? "default" : "outline"}
        size="sm"
        disabled={busy}
        onClick={toggle}
      >
        {track.removedByAdmin ? "숨김 해제" : "숨김 처리"}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
