"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LikeButton({
  trackId,
  initialLiked,
  initialCount,
}: {
  trackId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      if (liked) {
        await fetch(`/api/likes/${trackId}`, { method: "DELETE" });
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId }),
        });
        if (res.ok) {
          setLiked(true);
          setCount((c) => c + 1);
        }
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={liked ? "default" : "outline"}
      size="sm"
      disabled={busy}
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "좋아요 취소" : "좋아요"}
    >
      <svg
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        className="size-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s-6.716-4.29-9.428-8.114C.68 10.243 1.2 6.5 4.5 5.1c2.1-.9 4.4-.2 5.7 1.6L12 8.5l1.8-1.8c1.3-1.8 3.6-2.5 5.7-1.6 3.3 1.4 3.82 5.14 1.928 7.786C18.716 16.71 12 21 12 21z"
        />
      </svg>
      {count > 0 ? count : "좋아요"}
    </Button>
  );
}
