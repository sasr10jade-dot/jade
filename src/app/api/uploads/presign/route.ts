import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_THUMBNAIL_TYPES,
  ALLOWED_SHEET_MUSIC_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_THUMBNAIL_BYTES,
  MAX_SHEET_MUSIC_BYTES,
  createPresignedUpload,
} from "@/lib/storage";

const PresignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  purpose: z.enum(["track", "guide", "thumbnail", "sheet_music"]).default("track"),
});

const REQUIRED_ROLE = { track: "CREATOR", guide: "PERFORMER", thumbnail: "CREATOR", sheet_music: "CREATOR" } as const;
const FOLDER = { track: "tracks", guide: "guides", thumbnail: "thumbnails", sheet_music: "sheet-music" } as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = PresignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  const { filename, contentType, size, purpose } = parsed.data;

  const requiredRole = REQUIRED_ROLE[purpose];
  if (session.user.role !== requiredRole) {
    return NextResponse.json(
      { error: `${requiredRole}만 업로드할 수 있습니다` },
      { status: 403 }
    );
  }

  if (purpose === "thumbnail") {
    if (!ALLOWED_THUMBNAIL_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "JPEG, PNG, WEBP 이미지만 지원합니다" }, { status: 400 });
    }
    if (size > MAX_THUMBNAIL_BYTES) {
      return NextResponse.json({ error: "썸네일은 5MB를 초과할 수 없습니다" }, { status: 400 });
    }
  } else if (purpose === "sheet_music") {
    if (!ALLOWED_SHEET_MUSIC_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "PDF, JPEG, PNG 파일만 지원합니다" }, { status: 400 });
    }
    if (size > MAX_SHEET_MUSIC_BYTES) {
      return NextResponse.json({ error: "악보 파일은 20MB를 초과할 수 없습니다" }, { status: 400 });
    }
  } else {
    // EC-01: 지원 포맷 외 또는 300MB 초과 시 업로드 즉시 차단.
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "지원하지 않는 오디오 형식입니다" }, { status: 400 });
    }
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "파일이 300MB를 초과했습니다" }, { status: 400 });
    }
  }

  const presigned = await createPresignedUpload(filename, contentType, FOLDER[purpose]);
  return NextResponse.json(presigned);
}
