"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function FollowButton({ targetId, initialFollowing }: { targetId: string; initialFollowing: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      if (following) {
        await fetch(`/api/follows/${targetId}`, { method: "DELETE" });
        setFollowing(false);
      } else {
        const res = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId }),
        });
        if (res.ok) setFollowing(true);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={following ? "outline" : "default"} size="sm" disabled={busy} onClick={toggle}>
      {following ? "팔로잉" : "+ 팔로우"}
    </Button>
  );
}
