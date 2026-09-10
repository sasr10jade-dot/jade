import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Track file storage (FR-01). Three backends behind one interface:
 *  - Vercel Blob, once BLOB_READ_WRITE_TOKEN is set (auto-injected when a Blob
 *    store is linked to the Vercel project) — checked first.
 *  - S3-compatible (S3 itself, or Cloudflare R2 / any provider with an S3 API),
 *    once S3_* env vars are set.
 *  - Local disk (public/uploads/tracks), zero-config dev fallback.
 *
 * S3/local hand the client a URL to PUT the raw file to directly. Vercel Blob's
 * client-upload protocol needs its own token handshake (see /api/uploads/blob-handler
 * and src/lib/upload-client.ts), so `backend` tells the client which path to take.
 *
 * S3_ENDPOINT / S3_PUBLIC_URL are optional and only needed for non-AWS providers
 * like R2: S3_ENDPOINT is the API endpoint (https://<account>.r2.cloudflarestorage.com),
 * S3_PUBLIC_URL is the base URL files are served from (R2.dev subdomain or custom
 * domain) since R2 has no AWS-style `bucket.s3.region.amazonaws.com` address.
 */

export function isVercelBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export function isS3Configured(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_REGION &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

function s3Client() {
  return new S3Client({
    region: process.env.S3_REGION!,
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export interface PresignedUpload {
  backend: "vercel-blob" | "s3" | "local";
  key: string;
  uploadUrl?: string; // s3/local only — PUT the raw file here
  fileUrl?: string; // s3/local only — public URL to store on the Track record
}

export async function createPresignedUpload(
  originalName: string,
  contentType: string,
  folder: "tracks" | "guides" | "thumbnails" | "sheet-music" = "tracks"
): Promise<PresignedUpload> {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  const key = `${folder}/${randomUUID()}.${ext}`;

  if (isVercelBlobConfigured()) {
    // No URL to hand back yet — the client fetches its own upload token from
    // /api/uploads/blob-handler and only learns the final fileUrl once the
    // upload actually completes (see src/lib/upload-client.ts).
    return { backend: "vercel-blob", key };
  }

  if (isS3Configured()) {
    const client = s3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const fileUrl = process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`
      : `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
    return { backend: "s3", uploadUrl, fileUrl, key };
  }

  // Dev fallback: our own PUT endpoint writes straight to public/uploads/tracks.
  const uploadUrl = `/api/uploads/local?key=${encodeURIComponent(key)}`;
  const fileUrl = `/uploads/${key}`;
  return { backend: "local", uploadUrl, fileUrl, key };
}

// 300MB cap — FR-01 / EC-01.
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;
// audio/webm, audio/mp4, audio/ogg 추가 — 브라우저 마이크 녹음(MediaRecorder)이 내보내는
// 포맷은 브라우저마다 다름(Chrome=webm, Safari=mp4, Firefox=ogg/webm), 파일 업로드가 아니라
// 즉석 녹음 가이드 제출 기능을 지원하기 위함.
export const ALLOWED_CONTENT_TYPES = [
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
];

// 트랙 커버 썸네일 — 오디오보다 훨씬 작은 별도 한도/포맷.
export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
export const ALLOWED_THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 악보 — PDF(악보 편집기 export) 또는 스캔 이미지.
export const MAX_SHEET_MUSIC_BYTES = 20 * 1024 * 1024;
export const ALLOWED_SHEET_MUSIC_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// Shared between /api/uploads/presign (pre-flight check) and /api/uploads/blob-handler
// (the actual authorization boundary for Vercel Blob client uploads) so the two never drift.
export type UploadPurpose = "track" | "guide" | "thumbnail" | "sheet_music";

export const REQUIRED_ROLE: Record<UploadPurpose, "CREATOR" | "PERFORMER"> = {
  track: "CREATOR",
  guide: "PERFORMER",
  thumbnail: "CREATOR",
  sheet_music: "CREATOR",
};

export const UPLOAD_FOLDER: Record<UploadPurpose, "tracks" | "guides" | "thumbnails" | "sheet-music"> = {
  track: "tracks",
  guide: "guides",
  thumbnail: "thumbnails",
  sheet_music: "sheet-music",
};

export function purposeLimits(purpose: UploadPurpose): { allowed: string[]; max: number } {
  switch (purpose) {
    case "thumbnail":
      return { allowed: ALLOWED_THUMBNAIL_TYPES, max: MAX_THUMBNAIL_BYTES };
    case "sheet_music":
      return { allowed: ALLOWED_SHEET_MUSIC_TYPES, max: MAX_SHEET_MUSIC_BYTES };
    default:
      return { allowed: ALLOWED_CONTENT_TYPES, max: MAX_UPLOAD_BYTES };
  }
}
