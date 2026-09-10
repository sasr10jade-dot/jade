import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  REQUIRED_ROLE,
  UPLOAD_FOLDER,
  purposeLimits,
  createPresignedUpload,
} from "@/lib/storage";

const PresignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  purpose: z.enum(["track", "guide", "thumbnail", "sheet_music"]).default("track"),
});

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

  const { allowed, max } = purposeLimits(purpose);
  if (!allowed.includes(contentType)) {
    return NextResponse.json({ error: "지원하지 않는 파일 형식입니다" }, { status: 400 });
  }
  if (size > max) {
    return NextResponse.json(
      { error: `파일이 ${Math.floor(max / (1024 * 1024))}MB를 초과했습니다` },
      { status: 400 }
    );
  }

  const presigned = await createPresignedUpload(filename, contentType, UPLOAD_FOLDER[purpose]);
  return NextResponse.json({ ...presigned, purpose });
}
