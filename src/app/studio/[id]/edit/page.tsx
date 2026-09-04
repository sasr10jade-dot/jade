import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrackEditForm } from "./track-edit-form";

export default async function TrackEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const track = await prisma.track.findUnique({ where: { id }, include: { licenses: true } });
  if (!track || !session?.user || track.creatorId !== session.user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">트랙 수정</h1>
      <p className="mt-1 text-sm text-muted-foreground">{track.title}</p>
      <TrackEditForm track={track} />
    </div>
  );
}
