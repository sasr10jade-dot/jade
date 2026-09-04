import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { expireOverdueCommissions, notifyUpcomingCommissionDeadlines } from "@/lib/commissions";
import { OfferForm } from "./offer-form";
import { SelectOfferButton } from "./select-offer-button";
import { DeliverForm } from "./deliver-form";
import { CancelCommissionButton } from "./cancel-button";

const LICENSE_LABEL: Record<string, string> = {
  EXCLUSIVE: "Exclusive",
  NON_EXCLUSIVE: "Non-Exclusive",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "지원 모집 중",
  MATCHED: "매칭됨 (납품 대기)",
  DELIVERED: "납품 완료",
  CANCELLED: "취소됨",
  EXPIRED: "마감 지남",
};

export default async function CommissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await expireOverdueCommissions();
  await notifyUpcomingCommissionDeadlines();

  const [session, request] = await Promise.all([
    auth(),
    prisma.commissionRequest.findUnique({
      where: { id },
      include: {
        buyer: { select: { name: true, nickname: true, displayNickname: true } },
        offers: {
          orderBy: { createdAt: "desc" },
          include: { creator: { select: { id: true, name: true, nickname: true, displayNickname: true } } },
        },
        track: { select: { id: true, title: true } },
      },
    }),
  ]);
  if (!request) notFound();

  const isBuyer = session?.user?.id === request.buyerId;
  const myOffer = session?.user ? request.offers.find((o) => o.creatorId === session.user.id) : undefined;
  const selectedOffer = request.offers.find((o) => o.status === "SELECTED");
  const canApply =
    session?.user?.role === "CREATOR" && !isBuyer && !myOffer && request.status === "OPEN";
  const canDeliver =
    request.status === "MATCHED" && selectedOffer && session?.user?.id === selectedOffer.creatorId;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{request.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayName(request.buyer)} · {new Date(request.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{STATUS_LABEL[request.status]}</Badge>
          {isBuyer && request.status === "OPEN" && <CancelCommissionButton requestId={request.id} />}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{request.description}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{request.genre ?? "장르 미정"}</Badge>
        <Badge variant="outline">{request.mood ?? "무드 미정"}</Badge>
        <Badge variant="outline">{LICENSE_LABEL[request.licenseType]}</Badge>
        <Badge variant="outline">
          예산 {formatKRW(request.budgetMin)} ~ {formatKRW(request.budgetMax)}
        </Badge>
        <Badge variant="outline">마감 {new Date(request.deadline).toLocaleDateString("ko-KR")}</Badge>
      </div>

      {request.referenceUrl && (
        <p className="mt-3 text-sm">
          레퍼런스:{" "}
          <a
            href={request.referenceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary hover:underline"
          >
            {request.referenceUrl}
          </a>
        </p>
      )}

      {request.status === "DELIVERED" && request.track && (
        <div className="mt-6 rounded-lg border border-dashed p-4 text-sm">
          납품된 곡:{" "}
          <Link href={`/track/${request.track.id}`} className="text-primary hover:underline">
            {request.track.title} →
          </Link>
        </div>
      )}

      {canDeliver && (
        <div className="mt-8">
          <DeliverForm requestId={request.id} defaultTitle={request.title} />
        </div>
      )}

      {canApply && (
        <div className="mt-8">
          <OfferForm requestId={request.id} />
        </div>
      )}

      {myOffer && request.status === "OPEN" && (
        <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          이미 지원했습니다 — 제안 가격 {formatKRW(myOffer.price)}. 구매자의 선정을 기다리는 중입니다.
        </p>
      )}

      {isBuyer && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">지원한 크리에이터 ({request.offers.length})</h2>
          {request.offers.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">아직 지원이 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {request.offers.map((o) => (
                <div key={o.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{displayName(o.creator)}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{formatKRW(o.price)}</span>
                      <Badge variant="outline">{o.status}</Badge>
                    </span>
                  </div>
                  {o.message && <p className="mt-1 text-sm text-muted-foreground">{o.message}</p>}
                  {request.status === "OPEN" && o.status === "PENDING" && (
                    <div className="mt-3">
                      <SelectOfferButton requestId={request.id} offerId={o.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
