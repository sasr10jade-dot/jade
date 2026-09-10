import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { putObject } from "@/lib/storage";

// TEMPORARY — one-off migration helper to move pre-existing local/tunnel-hosted
// media into the active storage backend. Delete once the backfill is done.
export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const contentType = url.searchParams.get("contentType");
  if (!key || !contentType) {
    return NextResponse.json({ error: "key, contentType required" }, { status: 400 });
  }

  const buffer = Buffer.from(await req.arrayBuffer());
  const fileUrl = await putObject(key, buffer, contentType);
  return NextResponse.json({ url: fileUrl });
}
