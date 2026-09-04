"use client";

import { useRouter } from "next/navigation";
import { ThumbnailUploader } from "@/components/thumbnail-uploader";

// Studio 트랙 목록에서 기존 트랙에 썸네일을 나중에 붙이거나 교체 — 업로드 완료 시
// PATCH /api/tracks/[id]로 반영 후 목록을 새로고침.
export function StudioTrackThumbnail({ trackId, thumbnailUrl }: { trackId: string; thumbnailUrl: string | null }) {
  const router = useRouter();

  async function handleUploaded(url: string) {
    await fetch(`/api/tracks/${trackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnailUrl: url }),
    });
    router.refresh();
  }

  return <ThumbnailUploader size="sm" onUploaded={handleUploaded} initialUrl={thumbnailUrl} />;
}
