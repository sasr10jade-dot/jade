import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Track file storage (FR-01). Two backends behind one interface:
 *  - S3, once S3_* env vars are set (production).
 *  - Local disk (public/uploads/tracks), zero-config dev fallback.
 *
 * Either way the client does the exact same thing:
 *   fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } })
 * so upload-form.tsx never needs to know which backend is active.
 */

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
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export interface PresignedUpload {
  uploadUrl: string; // PUT the raw file here
  fileUrl: string; // public URL to store on the Track record
  key: string;
}

export async function createPresignedUpload(
  originalName: string,
  contentType: string,
  folder: "tracks" | "guides" | "thumbnails" = "tracks"
): Promise<PresignedUpload> {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  const key = `${folder}/${randomUUID()}.${ext}`;

  if (isS3Configured()) {
    const client = s3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
    return { uploadUrl, fileUrl, key };
  }

  // Dev fallback: our own PUT endpoint writes straight to public/uploads/tracks.
  const uploadUrl = `/api/uploads/local?key=${encodeURIComponent(key)}`;
  const fileUrl = `/uploads/${key}`;
  return { uploadUrl, fileUrl, key };
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
