const SECTIONS = [
  {
    title: "저작권 (KOMCA)",
    points: [
      "업로드 시 원작자 서약 필수 (표절 아님)",
      "계약서에 KOMCA 등록 정보 포함",
      "Exclusive 판매 시 원저작권 이전 옵션 체크",
      "AI 생성물 업로드 금지 조항",
    ],
  },
  {
    title: "실연권",
    points: [
      "가이드 보컬도 실연으로 간주, 실연권 20% 기본",
      "Performer 프로필에 실연자 정보 명시",
      "방송/공연 2차 사용 시 추가 정산 조항",
    ],
  },
  {
    title: "에스크로 & 정산",
    points: [
      "토스페이먼츠 에스크로: 구매 후 7일 이내 이의 없으면 정산",
      "플랫폼 수수료 Exclusive 20% / Non-Exclusive 15%",
      "월 1회 정산, 5만원 미만 이월",
      "환불: 원본 미다운로드 시 100%, 다운로드 후 50%",
    ],
  },
  {
    title: "분쟁 & 제재",
    points: [
      "표절 신고 시 72시간 내 블라인드 + 소명",
      "지분 분쟁 시 Split 로그가 Single Source of Truth",
      "3회 경고 시 업로드 제한",
      "법적 분쟁은 서울중앙지법 관할",
    ],
  },
];

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Policy & Legal</h1>
      <p className="mt-1 text-sm text-muted-foreground">신뢰를 위한 법적 장치</p>

      <div className="mt-6 space-y-6">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-sm font-semibold">{s.title}</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {s.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span>·</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-8 rounded-lg border-l-2 border-amber-500 bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
        법률 검토 필요 (외부 법무): 음악 저작권 양도 계약서 문구, 실연권 위임 범위, 에스크로
        통신판매업 신고, 개인정보 처리방침.
      </p>
    </div>
  );
}
