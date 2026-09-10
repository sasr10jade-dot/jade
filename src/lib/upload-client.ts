import { upload } from "@vercel/blob/client";
import type { UploadPurpose } from "@/lib/storage";

interface PresignResult {
  backend: "vercel-blob" | "s3" | "local";
  key: string;
  uploadUrl?: string;
  fileUrl?: string;
  purpose: UploadPurpose;
}

async function presignUpload(params: {
  filename: string;
  contentType: string;
  size: number;
  purpose?: UploadPurpose;
}): Promise<PresignResult> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "업로드 URL 발급에 실패했습니다");
  }
  return res.json();
}

function putWithProgress(
  url: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`업로드 실패 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("업로드 중 네트워크 오류가 발생했습니다"));
    xhr.send(file);
  });
}

/**
 * Presigns and uploads a file to whichever storage backend is active
 * (Vercel Blob / S3-compatible / local disk fallback — see src/lib/storage.ts),
 * reporting 0-100 progress along the way. Returns the file's public URL.
 */
export async function uploadFileToStorage(
  file: File,
  purpose: UploadPurpose,
  onProgress?: (pct: number) => void
): Promise<string> {
  const presigned = await presignUpload({
    filename: file.name,
    contentType: file.type,
    size: file.size,
    purpose,
  });

  if (presigned.backend === "vercel-blob") {
    const blob = await upload(presigned.key, file, {
      access: "public",
      handleUploadUrl: "/api/uploads/blob-handler",
      contentType: file.type,
      clientPayload: presigned.purpose,
      onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
    });
    return blob.url;
  }

  await putWithProgress(presigned.uploadUrl!, file, onProgress);
  return presigned.fileUrl!;
}
