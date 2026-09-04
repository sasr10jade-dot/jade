"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateFee, type LicenseType } from "@/lib/fee";
import { formatKRW } from "@/lib/format";

interface Track {
  id: string;
  title: string;
  licenses: { type: LicenseType; price: number }[];
  creator: { isSeedCreator: boolean; seedPromoUntil: Date | null };
}

type PayState = "idle" | "paying" | "error";

export function CheckoutForm({ track }: { track: Track }) {
  const [license, setLicense] = useState<LicenseType>("EXCLUSIVE");
  const [state, setState] = useState<PayState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<{
    amount: number;
    feeAmount: number;
    netAmount: number;
    feeRate: number;
  } | null>(null);

  const exclusive = track.licenses.find((l) => l.type === "EXCLUSIVE");
  const nonExclusive = track.licenses.find((l) => l.type === "NON_EXCLUSIVE");
  const price = track.licenses.find((l) => l.type === license)?.price ?? 0;

  // Client-side estimate only — creatorSalesCount is resolved server-side at order
  // creation time, since it can change between page load and the actual purchase.
  const fee = useMemo(
    () =>
      calculateFee({
        licenseType: license,
        amount: price,
        isSeedCreator: track.creator.isSeedCreator,
        seedPromoUntil: track.creator.seedPromoUntil,
        creatorSalesCount: 0,
      }),
    [license, price, track.creator]
  );

  async function pay() {
    setState("paying");
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id, licenseType: license }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "결제에 실패했습니다");
      }
      const created = await res.json();
      setOrder(created);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
      setState("error");
    }
  }

  if (order) {
    return (
      <div className="mx-auto max-w-lg px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">구매 완료</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          에스크로 보호 중 — 구매 후 7일 이내 이의 없으면 정산됩니다
        </p>
        <Card className="mt-6">
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">트랙</span>
              <span>{track.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">결제 금액</span>
              <span>{formatKRW(order.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                플랫폼 수수료 ({(order.feeRate * 100).toFixed(0)}%)
              </span>
              <span>{formatKRW(order.feeAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>판매자 정산 예정액</span>
              <span>{formatKRW(order.netAmount)}</span>
            </div>
          </CardContent>
        </Card>
        <Link href="/discover">
          <Button className="mt-6 w-full" size="lg">
            Discover로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">체크아웃</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        라이선스 선택(Exclusive/Non-Exclusive) → 결제
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {(
          [
            { type: "EXCLUSIVE" as const, price: exclusive?.price ?? 0, desc: "독점 사용, 원저작권 이전 옵션" },
            { type: "NON_EXCLUSIVE" as const, price: nonExclusive?.price ?? 0, desc: "비독점, 반복 판매 가능" },
          ]
        ).map((opt) => (
          <Card
            key={opt.type}
            onClick={() => setLicense(opt.type)}
            className={`cursor-pointer transition ${
              license === opt.type ? "ring-2 ring-foreground" : "hover:border-foreground/30"
            }`}
          >
            <CardContent>
              <p className="text-sm font-semibold">
                {opt.type === "EXCLUSIVE" ? "Exclusive" : "Non-Exclusive"}
              </p>
              <p className="mt-1 text-lg font-semibold">{formatKRW(opt.price)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">트랙</span>
            <span>{track.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">라이선스</span>
            <span>{license === "EXCLUSIVE" ? "Exclusive" : "Non-Exclusive"}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>합계</span>
            <span>{formatKRW(price)}</span>
          </div>
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        에스크로 보호: 구매 후 7일 이내 이의 없으면 정산
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        플랫폼 수수료 {(fee.rate * 100).toFixed(0)}% 적용 예정 (판매자 정산 기준)
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {["토스페이먼츠", "카드", "계좌이체"].map((m) => (
          <Badge key={m} variant="outline" className="rounded-full px-3 py-1.5">
            {m}
          </Badge>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive">
          {error}
          {error === "로그인이 필요합니다" && (
            <>
              {" "}
              <Link href="/login" className="underline">
                로그인하기
              </Link>
            </>
          )}
        </p>
      )}

      <Button className="mt-6 w-full" size="lg" onClick={pay} disabled={state === "paying" || price === 0}>
        {state === "paying" ? "결제 처리 중..." : "결제하기 → (개발용 모의 결제, 토스페이먼츠 연동 전)"}
      </Button>
    </div>
  );
}
