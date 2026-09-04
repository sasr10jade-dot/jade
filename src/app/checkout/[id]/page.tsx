import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = await prisma.track.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      licenses: { select: { type: true, price: true } },
      creator: { select: { isSeedCreator: true, seedPromoUntil: true } },
    },
  });
  if (!track) notFound();

  return <CheckoutForm track={track} />;
}
