import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fire-and-forget from player components whenever playback actually starts
// (not on page view) — drives Discover's 인기순 sort. No auth required; this is
// a public listen-counter, not a purchase/ownership action.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.track.update({
      where: { id },
      data: { playCount: { increment: 1 } },
    });
  } catch {
    // Track may not exist (e.g. stale client) — not worth surfacing an error for a counter.
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
