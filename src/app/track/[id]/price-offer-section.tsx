"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKRW } from "@/lib/format";

type License = { id: string; type: "EXCLUSIVE" | "NON_EXCLUSIVE"; price: number };
type Offer = {
  id: string;
  licenseId: string;
  amount: number;
  status: "PROPOSED" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "STALLED" | "EXPIRED";
  lastActorId: string;
  buyerId: string;
  buyer?: { name: string };
};

const STATUS_LABEL: Record<Offer["status"], string> = {
  PROPOSED: "제안됨",
  COUNTERED: "역제안됨",
  ACCEPTED: "수락됨",
  REJECTED: "거절됨",
  STALLED: "보류됨 (관리자 개입 필요)",
  EXPIRED: "만료됨 (7일간 응답 없음)",
};

const LICENSE_LABEL: Record<License["type"], string> = {
  EXCLUSIVE: "Exclusive",
  NON_EXCLUSIVE: "Non-Exclusive",
};

async function respond(offerId: string, body: object) {
  const res = await fetch(`/api/offers/${offerId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "처리에 실패했습니다");
  }
}

// 구매자 → 크리에이터 가격 흥정 UI. 트랙 소유자는 들어온 제안에 수락/거절/역제안,
// 그 외 로그인 유저(구매자)는 라이선스별로 새 제안을 만들거나 진행 중인 제안에 응답한다.
export function PriceOfferSection({
  trackId,
  licenses,
  offers,
  isOwner,
  viewerId,
}: {
  trackId: string;
  licenses: License[];
  offers: Offer[];
  isOwner: boolean;
  viewerId: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counterAmounts, setCounterAmounts] = useState<Record<string, string>>({});
  const [newOfferAmount, setNewOfferAmount] = useState<Record<string, string>>({});

  async function handle(offerId: string, body: object) {
    setBusyId(offerId);
    setError(null);
    try {
      await respond(offerId, body);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePropose(licenseId: string, licenseType: License["type"]) {
    const amountStr = newOfferAmount[licenseId];
    const amount = Number(amountStr);
    if (!amountStr || !Number.isFinite(amount) || amount <= 0) {
      setError("올바른 금액을 입력해주세요");
      return;
    }
    setBusyId(licenseId);
    setError(null);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, licenseType, amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "제안에 실패했습니다");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusyId(null);
    }
  }

  const activeOffers = offers.filter((o) => o.status === "PROPOSED" || o.status === "COUNTERED");
  const closedOffers = offers.filter((o) => !activeOffers.includes(o));

  return (
    <div className="mt-4 space-y-3">
      {isOwner ? (
        <>
          {activeOffers.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              들어온 가격 제안이 없습니다.
            </p>
          )}
          {activeOffers.map((offer) => {
            const license = licenses.find((l) => l.id === offer.licenseId);
            const myTurn = offer.lastActorId !== viewerId;
            return (
              <div key={offer.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {offer.buyer?.name ?? "구매자"} · {license ? LICENSE_LABEL[license.type] : ""}
                  </span>
                  <Badge variant="outline">{STATUS_LABEL[offer.status]}</Badge>
                </div>
                <p className="mt-1 text-lg font-semibold">{formatKRW(offer.amount)}</p>
                {myTurn ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" disabled={busyId === offer.id} onClick={() => handle(offer.id, { action: "ACCEPT" })}>
                      수락
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === offer.id}
                      onClick={() => handle(offer.id, { action: "REJECT" })}
                    >
                      거절
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      placeholder="역제안 금액"
                      className="h-8 w-32"
                      value={counterAmounts[offer.id] ?? ""}
                      onChange={(e) => setCounterAmounts((p) => ({ ...p, [offer.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === offer.id || !counterAmounts[offer.id]}
                      onClick={() =>
                        handle(offer.id, { action: "COUNTER", amount: Number(counterAmounts[offer.id]) })
                      }
                    >
                      역제안
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">상대방의 응답을 기다리는 중입니다.</p>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <>
          {licenses.map((license) => {
            const offer = offers.find((o) => o.licenseId === license.id);
            if (!offer) {
              return (
                <div key={license.id} className="rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    {LICENSE_LABEL[license.type]} · 정가 {formatKRW(license.price)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="제안 금액 (원)"
                      className="h-8 w-40"
                      value={newOfferAmount[license.id] ?? ""}
                      onChange={(e) => setNewOfferAmount((p) => ({ ...p, [license.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === license.id}
                      onClick={() => handlePropose(license.id, license.type)}
                    >
                      가격 제안하기
                    </Button>
                  </div>
                </div>
              );
            }
            const myTurn = offer.lastActorId !== viewerId;
            const active = offer.status === "PROPOSED" || offer.status === "COUNTERED";
            return (
              <div key={license.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{LICENSE_LABEL[license.type]}</span>
                  <Badge variant="outline">{STATUS_LABEL[offer.status]}</Badge>
                </div>
                <p className="mt-1 text-lg font-semibold">{formatKRW(offer.amount)}</p>
                {active && myTurn && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" disabled={busyId === offer.id} onClick={() => handle(offer.id, { action: "ACCEPT" })}>
                      수락
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === offer.id}
                      onClick={() => handle(offer.id, { action: "REJECT" })}
                    >
                      거절
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      placeholder="역제안 금액"
                      className="h-8 w-32"
                      value={counterAmounts[offer.id] ?? ""}
                      onChange={(e) => setCounterAmounts((p) => ({ ...p, [offer.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === offer.id || !counterAmounts[offer.id]}
                      onClick={() =>
                        handle(offer.id, { action: "COUNTER", amount: Number(counterAmounts[offer.id]) })
                      }
                    >
                      역제안
                    </Button>
                  </div>
                )}
                {active && !myTurn && (
                  <p className="mt-2 text-xs text-muted-foreground">상대방의 응답을 기다리는 중입니다.</p>
                )}
              </div>
            );
          })}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {closedOffers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          지난 제안 {closedOffers.length}건 (거절/수락/보류)은 목록에서 생략됩니다.
        </p>
      )}
    </div>
  );
}
