"use client";

import { useId, useState } from "react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;

// 프리사인 업로드(purpose: "thumbnail") → 완료되면 fileUrl을 onUploaded로 전달.
// 실제로 어디에 반영할지(신규 트랙 생성 payload에 포함 vs 기존 트랙 PATCH)는 호출부가 결정.
// size="sm": Studio 목록처럼 한 페이지에 여러 개가 나란히 붙는 경우용 축소 버전.
export function ThumbnailUploader({
  onUploaded,
  initialUrl,
  size = "default",
}: {
  onUploaded: (url: string) => void;
  initialUrl?: string | null;
  size?: "default" | "sm";
}) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("JPEG, PNG, WEBP 이미지만 지원합니다");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`썸네일은 ${MAX_SIZE_MB}MB를 초과할 수 없습니다`);
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          purpose: "thumbnail",
        }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error ?? "업로드 URL 발급에 실패했습니다");
      }
      const { uploadUrl, fileUrl } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`업로드 실패 (${putRes.status})`);

      onUploaded(fileUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  }

  const sizeClass = size === "sm" ? "size-14 rounded-lg" : "w-full max-w-40 rounded-xl";

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden border border-dashed bg-muted text-center text-muted-foreground hover:border-foreground/40 ${sizeClass} ${size === "sm" ? "text-[9px]" : "text-xs"}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="썸네일 미리보기" className="h-full w-full object-cover" />
        ) : (
          <span className="px-1">{size === "sm" ? "썸네일" : "썸네일 이미지 업로드"}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-[9px]">
            업로드 중
          </div>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>
      {error && <p className="mt-1.5 max-w-40 text-xs text-destructive">{error}</p>}
    </div>
  );
}
