import Link from "next/link";

const ROLE_GUIDES = [
  {
    role: "Creator (작곡가)",
    steps: [
      "트랙 업로드 — 음원(WAV/MP3) + 가사 + 악보(선택) + 커버 썸네일 등록",
      "가이드 모집 — Performer들이 보컬 가이드를 제출하면 A/B로 비교 청취",
      "Split 협상 — 마음에 드는 가이드를 골라 저작권 분배 비율(기본 80/20) 제안·협의",
      "라이선스 가격 설정(Exclusive/Non-Exclusive) 후 판매 시작 — 구매자가 가격을 흥정해올 수도 있음",
      "판매되면 7일 에스크로 후 VOICE Cash로 자동 정산 — Studio에서 재생/좋아요/매출 추이 확인 가능",
      "곡을 먼저 올리는 대신, 등록된 곡 의뢰에 직접 지원해 역방향으로 곡을 팔 수도 있음",
    ],
  },
  {
    role: "Performer (보컬)",
    steps: [
      "가이드 모집(/matching)에서 마음에 드는 트랙 탐색 — 가이드가 적은 트랙부터 우선 노출",
      "가이드 제출 — 파일 업로드 또는 브라우저에서 바로 녹음(별도 녹음 장비 없이 가능)",
      "크리에이터가 채택하면 Split 협상 참여 — 합의된 비율대로 정산 수익 발생",
      "Studio에서 제출한 가이드 현황, 채택률, 누적 정산 수익 확인 가능",
    ],
  },
  {
    role: "Buyer (구매자)",
    steps: [
      "Discover/검색에서 트랙 탐색 — 구매 전에도 전곡 청취·가사·악보 확인 가능",
      "정가 구매 또는 가격 제안(흥정) — 크리에이터가 수락하면 그 금액으로 즉시 구매 확정",
      "구매 후 7일 에스크로 — 그 안에 다운로드/검수, 문제가 있으면 이의 제기 가능(이후 자동 정산)",
      "원하는 곡이 없다면 직접 곡 의뢰 등록 — 예산/마감일을 올리면 크리에이터들이 지원",
    ],
  },
];

const FAQ = [
  {
    q: "VOICE Cash가 뭔가요?",
    a: "플랫폼 안에서만 쓰이는 폐쇄형 포인트입니다(1 Cash = 1원, 외부 이전·거래 불가). 구매 시 부족분은 자동 충전되고(모의 결제), 판매 수익은 정산되면 VOICE Cash로 적립됩니다. 지갑 페이지에서 정산 신청을 하면 관리자가 실제 원화로 지급합니다.",
  },
  {
    q: "에스크로는 어떻게 동작하나요?",
    a: "구매 금액은 7일간 에스크로에 보관됩니다. 그 안에 구매자가 별다른 이의를 제기하지 않으면 자동으로 정산되어 크리에이터(및 Split 합의된 Performer)에게 지급됩니다. 문제가 있다면 그 기간 안에 이의를 제기해 관리자 검토를 받을 수 있습니다.",
  },
  {
    q: "Exclusive와 Non-Exclusive 라이선스의 차이는?",
    a: "Exclusive는 독점 라이선스로 가격이 더 높고 수수료율도 다르게 적용됩니다. Non-Exclusive는 같은 곡을 여러 구매자에게 판매할 수 있는 비독점 라이선스입니다.",
  },
  {
    q: "곡 의뢰(Commission)는 일반 구매와 뭐가 다른가요?",
    a: "일반적인 흐름은 크리에이터가 곡을 먼저 올리고 구매자가 찾아서 사는 방식이지만, 곡 의뢰는 반대로 구매자가 원하는 조건(장르/무드/예산/마감일)을 먼저 올리면 크리에이터들이 가격을 제안하고, 구매자가 그중 한 명을 선정해 곡을 받는 방식입니다.",
  },
  {
    q: "Split(저작권 분배)은 어떻게 정해지나요?",
    a: "기본값은 Creator 80% / Performer 20%지만, 가이드가 채택되면 두 사람이 제안·역제안을 주고받으며 협의합니다. 역제안이 3회를 초과하면 보류 상태로 전환되어 관리자가 최종 비율을 확정합니다.",
  },
  {
    q: "가격 제안(흥정)이 응답 없이 방치되면 어떻게 되나요?",
    a: "7일간 응답이 없으면 자동으로 만료됩니다. 만료 24시간 전에는 응답할 차례인 쪽에게 알림이 갑니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">이용 가이드</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        VOICEMAP은 역할(Creator/Performer/Buyer)에 따라 쓰는 방식이 조금씩 달라요.
      </p>

      <div className="mt-8 space-y-8">
        {ROLE_GUIDES.map((g) => (
          <div key={g.role}>
            <h2 className="text-lg font-semibold">{g.role}</h2>
            <ol className="mt-3 space-y-2">
              {g.steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">자주 묻는 질문</h2>
      <div className="mt-4 space-y-4">
        {FAQ.map((f) => (
          <div key={f.q}>
            <p className="text-sm font-semibold">Q. {f.q}</p>
            <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        여기서 해결되지 않는 문제가 있다면{" "}
        <Link href="/support/new" className="text-primary hover:underline">
          고객센터에 문의
        </Link>
        해주세요.
      </p>
    </div>
  );
}
