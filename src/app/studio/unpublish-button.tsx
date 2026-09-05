"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// 판매 이력이 걸려있는 트랙은 하드 삭제 대신 비공개 전환만 지원 — Discover/검색/홈
// 등 노출 지면에서만 숨기고, 이미 구매한 사람의 다운로드/기존 링크는 그대로 유지된다.
export function UnpublishButton({ trackId, removed }: { trackId: string; removed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/tracks/${trackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removedByCreator: !removed }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={toggle}>
      {busy ? "처리 중..." : removed ? "공개로 전환" : "비공개로 전환"}
    </Button>
  );
}
