import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, MAX_THUMBNAIL_BYTES } from "@/lib/storage";

export const runtime = "nodejs";

// Dev-only stand-in for S3's presigned PUT — see lib/storage.ts. Mirrors the
// same `PUT <url>` contract so upload-form.tsx works unchanged against either backend.
const KEY_PATTERN = /^(tracks|guides|thumbnails)\/[a-f0-9-]{36}\.[a-zA-Z0-9]+$/;
const ALLOWED_ROLES = new Set(["CREATOR", "PERFORMER"]);

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const match = key?.match(KEY_PATTERN);
  if (!match) {
    return NextResponse.json({ error: "잘못된 key입니다" }, { status: 400 });
  }
  const [, folder] = match;

  const buf = Buffer.from(await req.arrayBuffer());
  const maxBytes = folder === "thumbnails" ? MAX_THUMBNAIL_BYTES : MAX_UPLOAD_BYTES;
  if (buf.byteLength > maxBytes) {
    return NextResponse.json({ error: "파일 크기가 허용 범위를 초과했습니다" }, { status: 400 });
  }

  const destDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(destDir, { recursive: true });
  const filename = path.basename(key!);
  await writeFile(path.join(destDir, filename), buf);

  return NextResponse.json({ ok: true });
}
