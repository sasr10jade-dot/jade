"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE_MB = 20;

// ThumbnailUploader와 동일한 프리사인 업로드 패턴이지만, 악보는 PDF일 수 있어 이미지
// 미리보기 대신 파일명 + "보기" 링크로 표시.
export function SheetMusicUploader({
  onUploaded,
  initialUrl,
}: {
  onUploaded: (url: string | null) => void;
  initialUrl?: string | null;
}) {
  const inputId = useId();
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [filename, setFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("PDF, JPEG, PNG 파일만 지원합니다");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`악보 파일은 ${MAX_SIZE_MB}MB를 초과할 수 없습니다`);
      return;
    }

    setUploading(true);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          purpose: "sheet_music",
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

      setUrl(fileUrl);
      setFilename(file.name);
      onUploaded(fileUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    setUrl(null);
    setFilename(null);
    onUploaded(null);
  }

  return (
    <div>
      {url ? (
        <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
          <a href={url} target="_blank" rel="noreferrer noopener" className="flex-1 truncate text-primary hover:underline">
            {filename ?? "등록된 악보 보기"}
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={remove}>
            삭제
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground hover:border-foreground/40"
        >
          <span>{uploading ? "업로드 중..." : "PDF 또는 이미지로 악보 업로드"}</span>
          <span className="text-xs">최대 {MAX_SIZE_MB}MB</span>
          <input
            id={inputId}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      )}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
