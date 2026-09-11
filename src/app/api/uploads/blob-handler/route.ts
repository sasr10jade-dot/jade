import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { REQUIRED_ROLE, purposeLimits, type UploadPurpose } from "@/lib/storage";

// The real authorization boundary for Vercel Blob client uploads (FR-01). The
// browser never gets a raw write token — it calls this route (via @vercel/blob/client's
// upload()) to exchange a short-lived, scoped client token, matching the same
// role/type/size checks /api/uploads/presign already ran as a pre-flight check.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const purpose = (clientPayload as UploadPurpose | null) ?? "track";
        const requiredRole = REQUIRED_ROLE[purpose];
        if (session.user!.role !== requiredRole && !session.user!.isAdmin) {
          throw new Error(`${requiredRole}만 업로드할 수 있습니다`);
        }

        const { allowed, max } = purposeLimits(purpose);
        return {
          allowedContentTypes: allowed,
          maximumSizeInBytes: max,
        };
      },
      onUploadCompleted: async () => {
        // No DB side effect needed here — the client already gets the final
        // blob URL back from upload()'s return value and saves it itself.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "업로드 토큰 발급에 실패했습니다" },
      { status: 400 }
    );
  }
}
