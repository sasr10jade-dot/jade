# VOICEMAP

작곡가와 보컬을 연결하고, 구매와 저작권을 하나의 플로우로 관리하는 음악 마켓플레이스.

전체 제품 요구사항은 [`Voicemap-Prd-V0.html`](./Voicemap-Prd-V0.html) (인터랙티브) 또는
[`Voicemap-PRD-v0.1.docx`](./Voicemap-PRD-v0.1.docx) 참고.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **shadcn/ui** — PRD Roadmap W1-2에 명시된 디자인 시스템. 브랜드 팔레트는
  [`Voicemap-Bi-Kit.html`](./Voicemap-Bi-Kit.html)에 정의된 값을 그대로
  `src/app/globals.css`의 CSS 변수로 옮긴 것 — 근블랙 배경(`#0A0A0A`/`#111111`) +
  네온 라임 primary(`#7FFF00`), radius 1rem으로 기본 버튼이 필(pill) 형태가 되도록 설정.
  모든 shadcn 컴포넌트가 토큰만 참조하므로 이 파일 하나로 전체 앱 룩이 바뀝니다.
- **Prisma** ORM — dev: SQLite(zero-config) / prod: PostgreSQL로 전환 예정
- **Auth.js v5** — Credentials(이메일/비밀번호) + role(Creator/Performer/Buyer) 기반 접근 제어
- **파일 업로드** — S3 presigned PUT, 미설정 시 로컬 디스크(`public/uploads`)로 자동 폴백
- 토스페이먼츠 연동은 아직 미구현 (Roadmap 참고)

## Getting Started

```bash
npm install
cp .env.example .env   # 이미 되어있음, DATABASE_URL 등 실제 값으로 교체
npx prisma migrate dev --name init
npx prisma db seed     # 데모 데이터(트랙 3개, 유저 4명) 채우기
npm run dev
```

http://localhost:3000 에서 확인.

## 라우트 (PRD Section 5 — IA / Sitemap)

| 라우트 | 설명 | 관련 FR |
|---|---|---|
| `/discover` | 탐색, 필터, 플레이어 | FR-03, FR-08 |
| `/track/[id]` | 곡 상세, 가이드 비교, Split | FR-03 |
| `/upload` | Creator 업로드 플로우 | FR-01 |
| `/studio` | 내 트랙, 가이드 관리 | — |
| `/inbox` | 매칭 요청, 제안 | FR-02 |
| `/checkout/[id]` | 라이선스 선택 & 결제 | FR-05 |
| `/orders` | 구매내역 (Buyer) | FR-05 |
| `/settings/split` | Split 에디터 | FR-04 |
| `/legal` | Policy & Legal | Section 7 |
| `/admin` | 관리자 대시보드 (ADMIN 전용) | — |
| `/admin/users` | 사용자 관리 | — |
| `/admin/tracks` | 트랙 모더레이션 | — |
| `/admin/disputes` | Split/주문 분쟁 개입 | FR-04, Section 7/12 |
| `/admin/settlements` | 정산 신청 큐 (지급 완료 처리) | Section 12 |
| `/register` | 회원가입 (닉네임/공개표시 선택 포함) | — |
| `/wallet` | VOICE Cash 지갑 (충전/정산신청/거래내역) | Section 12 |
| `/settings/account` | 회원정보 수정 (이름/닉네임/공개표시/이메일) | — |
| `/studio/[id]/edit` | 트랙 수정 (음원/제목/장르/BPM/가사/썸네일) | — |
| `/search` | 트랙/크리에이터 통합 검색 | — |
| `/commissions` | 곡 의뢰 목록 (지원 가능한 의뢰 / 내가 등록한 의뢰) | — |
| `/commissions/new` | 곡 의뢰 등록 | — |
| `/commissions/[id]` | 의뢰 상세 · 지원 · 선정 · 납품 | — |

모든 페이지가 Prisma로 실제 DB를 조회합니다 (`prisma/seed.ts`로 채운 데모 데이터 기준).

## 핵심 비즈니스 로직

- `src/lib/fee.ts` — PRD Section 12 (Fee & Payout Structure)의 수수료율·정산·환불 계산을
  코드로 그대로 옮긴 것. 요율표(Exclusive 20% / Non-Exclusive 15% / 시드 프로모션 10%)가
  바뀌면 여기 한 곳만 고치면 됩니다.
- `prisma/schema.prisma` — Section 5 객체 모델(Track/Guide/Split/License) + Section 12
  Fee 스냅샷을 반영한 스키마.

## 다음 단계 (Roadmap W1-2 Foundation 기준)

- [x] Auth — 회원가입(`/register`)·로그인(`/login`)·역할별 접근 제어(middleware `proxy.ts`),
      `/upload`·`/studio`는 Creator 전용
- [x] S3 presigned upload — `/upload` → `/api/uploads/presign` → `/api/tracks`, S3 미설정 시
      `/api/uploads/local`로 자동 폴백 (실제 파일 저장 + Track DB 생성까지 동작 확인)
- [x] 파형 플레이어 — `/track/[id]` 가이드 비교, `fetch`+`AudioContext.decodeAudioData`로 실제
      오디오에서 피크를 추출해 그리는 자체 구현 (외부 라이브러리 없음). A/B 전환 시 재생 위치 유지,
      30초 프리뷰 컷오프(FR-03/FR-08) 포함
- [x] mock-data.ts → Prisma 실제 쿼리 전환 완료 — Discover/Track 상세/Studio/Inbox/체크아웃/Split
      에디터 전부 실제 DB를 조회합니다. `prisma/seed.ts`로 데모 데이터(트랙 3개, 가이드, Split
      로그, 알림, 주문 1건)를 채울 수 있습니다: `npx prisma db seed`
- [x] Performer 가이드 업로드 플로우 (Roadmap W3-4) — `/track/[id]`에 Performer 전용
      `GuideSubmitForm` 추가. 프리사인 업로드(`purpose: "guide"` → `guides/` 폴더) →
      `POST /api/guides`로 Guide 생성 + Track 상태 `DRAFT → MATCHING` 전이 + 크리에이터에게
      `GUIDE_SUBMITTED` 알림 생성까지 하나의 트랜잭션. 이미 제출한 경우/트랙이 이미 확정된
      경우(`SPLIT_AGREED`/`LISTED`, EC-04) 상태별 안내 문구로 분기.
- [x] Split 협의 플로우 (FR-04) — Creator가 트랙 상세 페이지(`/track/[id]`)에서 가이드를 제출한
      Performer에게 초기 분배율을 제안(`POST /api/splits`), 이후 양측이 `/settings/split`에서
      수락/역제안(`POST /api/splits/[id]/respond`)을 주고받습니다. 매 액션마다 `SplitLogEntry`
      기록 + 상대방에게 알림(`SPLIT_PROPOSED`/`SPLIT_COUNTERED`/`SPLIT_AGREED`) 생성, 수락 시
      `Track.status`를 `SPLIT_AGREED`로 전이(이후 해당 트랙은 EC-04로 가이드 제출도 자동 차단).
      역제안 3회 초과 시 `STALLED`로 보류(EC-05). 턴제 강제: 마지막으로 액션한 쪽은 다시
      액션할 수 없고 `Split.lastActorId` 필드로 판별 — 처음엔 `SplitLogEntry`를 `createdAt desc`로
      정렬해 마지막 행위자를 구했는데, SQLite에서 같은 배치로 만든 로그들의 타임스탬프가 밀리초까지
      동일하게 찍혀 정렬이 비결정적이었고(실제로 동일인이 연속 두 번 액션하는 버그로 재현됨),
      그래서 `Split`에 `lastActorId`를 직접 저장해 트랜잭션마다 갱신하는 방식으로 고쳤습니다.
- [x] 체크아웃 / 주문 생성 (FR-05) — `/checkout/[id]`에서 라이선스 선택 후 `POST /api/orders`로
      실제 `Order` 레코드 생성. `lib/fee.ts`의 요율 계산을 그대로 사용(크리에이터의
      `isSeedCreator`/`seedPromoUntil`/실제 확정 판매 건수 조회 포함), `status: ESCROW` +
      `escrowEndsAt = 구매 시각 + 7일`로 저장. 토스페이먼츠 연동 전이라 실제 PG 대신
      "결제하기" 클릭 시 바로 주문을 확정하는 개발용 모의 결제 — S3 미설정 시 로컬 디스크로
      폴백하는 것과 같은 패턴입니다. 실 연동은 Roadmap W5-6에서 이 라우트 내부만 교체하면 됩니다.
- [x] 구매내역 / 정산 내역 뷰 — `/orders`(Buyer, 로그인 필요·`proxy.ts` 보호 경로에 추가)에서
      본인 `Order` 목록을 라이선스·금액·에스크로 D-day/정산일과 함께 확인. `/studio`에는
      Creator용 "정산 내역" 섹션을 추가해 트랙별 판매 건을 구매자·정산액·상태와 함께 보여주고
      에스크로 대기/정산 완료 합계를 상단에 표시.
- [x] 에스크로 자동 정산 (Section 7/12) — `src/lib/settlement.ts`의 `settleExpiredEscrows()`가
      `escrowEndsAt`이 지난 `ESCROW` 주문을 `SETTLED`로 전이. 실제 크론/스케줄러가 없는 개발
      환경이라 `/orders`·`/studio`·`/admin` 페이지가 렌더링되기 직전에 lazy하게 실행하는 방식 —
      "구매 후 7일 이내 이의 없으면 정산"이라는 문구가 체크아웃부터 legal 페이지까지 여러 곳에
      쓰여 있었지만, 이 작업 전까지는 관리자가 DISPUTED 주문을 수동으로 정산 처리하는 경로 외에는
      주문이 SETTLED에 도달할 방법이 전혀 없었음(진짜 실 서비스 배포 시엔 이 함수를 cron이나
      백그라운드 잡으로 옮기면 됨).
- [x] 재생 엔진을 Howler.js로 교체 — 네이티브 `<audio>` 직접 제어 방식을 Howler(`html5: true`,
      전체 디코딩 없이 스트리밍) 기반으로 바꿈. UI는 100% 커스텀 마크업 그대로 유지 —
      Howler는 헤드리스 엔진이라 디자인에 영향 없음. 교체 과정에서 진짜 버그를 하나 더
      발견: `GuideComparisonPlayer`의 재생 시간 추적 루프가 `howl.playing()`이 매 프레임
      true인지에 의존했는데, html5 모드에서는 재생 시작 직후 버퍼링 중 한두 프레임 동안
      `playing()`이 false를 반환할 수 있어 루프가 그 즉시 멈춰버림 — 그러면 재생 버튼은
      "일시정지" 아이콘으로 바뀌는데 시간은 0:00에 고정된 채 안 움직이는 상태가 됨.
      Howler의 상태를 매 프레임 신뢰하는 대신, 우리가 직접 관리하는 `isPlayingRef`로
      재생 의도를 추적하도록 변경 — `TrackPlayer`/`GuideComparisonPlayer` 둘 다 적용.
      브라우저에서 실제 재생 시간이 흐르는 것까지 확인(클릭 1회 → 3초 후 0:08로 정확히 진행).
- [x] 플레이어 재생 버튼이 안 눌리던 진짜 버그 수정 — `TrackPlayer`/`GuideComparisonPlayer`
      둘 다 재생 버튼에 `disabled={!peaks}`가 걸려 있었는데, `peaks`는 파형을 그리기 위해
      **파일 전체를 fetch + Web Audio API로 디코딩**해야 채워짐 — 실제 곡(4~12MB)에서는
      이 작업이 오래 걸리거나 늦게 끝나서 그동안 재생 버튼이 계속 비활성 상태였음(파형은
      순전히 장식용 시각화일 뿐, 네이티브 `<audio>` 재생 자체와는 무관한데도 재생을
      막고 있었던 것). 두 컴포넌트 모두 `disabled` 제거 — 이제 페이지 로드 직후에도
      바로 클릭 가능하고, 파형은 준비되는 대로 백그라운드에서 채워짐.
- [x] 대량 업로드한 99곡에 가이드 레코드 추가 — 이 곡들은 이미 보컬이 포함된 완성곡이라
      "가이드 대기중"이 아니라 "가이드 보컬 포함"으로 보여야 하는데, 업로드 API가
      Guide를 만들지 않아 전부 대기중으로 표시되고 있었음. 트랙당 Guide 1개씩(연주자=
      김광석 본인, status: SELECTED) 일괄 생성해 Discover 배지가 정확하게 표시되도록 수정.
- [x] 로그아웃 수정 + 지훈 → 광석(실계정) 전환 — `SignOutButton`도 로그인과 같은 이유로
      Server Action(`src/lib/auth-actions.ts`의 `logoutAction`)으로 재작성. 기존 가짜
      데모 Creator "지훈"의 모든 참조(Track.creatorId, Split.lastActorId, SplitLogEntry.actorId,
      Notification)를 실계정 김광석(sasr10@naver.com)으로 일괄 이관하고 지훈 계정 삭제.
      `prisma/seed.ts`는 이제 전체 삭제(`deleteMany()`) 대신 **범위가 한정된** 정리만
      수행 — 가짜 데모 계정(서아/민지/민수/관리자) + 3개 내러티브 트랙(제목으로 식별)만
      지우고, 실계정과 그 실제 카탈로그(현재 99곡)는 `upsert(update: {})`로 절대
      건드리지 않음. 재시딩해도 실 데이터가 안전하도록 만든 것 — 이전 방식이었다면
      이번 세션에서 이미 여러 번 실행한 reseed 때문에 실 업로드 카탈로그가 전부
      삭제됐을 것.
      `demo-accounts.ts`의 빠른 로그인 목록도 지훈 → 광석으로 교체하고, 계정별 비밀번호를
      지원하도록 확장(광석은 다른 데모 계정과 비밀번호가 다른 실제 계정이라).
- [x] 원곡 전곡 듣기 + 인기순 정렬 — Performer가 어떤 곡에 가이드를 제출할지 판단하려면
      가이드가 없어도 원곡을 처음부터 끝까지 들을 수 있어야 하는데, 기존엔 가이드가 2개
      이상 있어야만 재생 가능했고 그마저도 30초로 잘렸음(Performer/Creator 여부와
      무관하게 `previewOnly`가 항상 true). `TrackPlayer` 컴포넌트를 새로 만들어 트랙
      상세 페이지에 항상 노출(프리뷰 제한 없음)하고, 가이드 비교 플레이어의 30초 제한은
      바이어일 때만 적용되도록 수정(`previewOnly={!isPerformer && !isOwner}`).
      웨이브폼 추출 로직은 `src/lib/waveform.ts`로 공통화. 재생 시작 시 `Track.playCount`를
      증가시키는 `POST /api/tracks/[id]/play`도 추가해 Discover가 최신순 대신
      **재생 많은 순(인기순)** 으로 정렬되도록 변경 — 카드에 재생 횟수도 표시.
- [x] 실사용자 계정 + 실제 카탈로그 대량 업로드 — `sasr10@naver.com`(김광석, Creator)으로
      실제 계정을 만들고, `Jade_Vol1` 폴더의 실제 창작곡 99곡 전체를 실 업로드 파이프라인
      (`/api/uploads/presign` → PUT → `POST /api/tracks`)을 통해 그대로 업로드하는 스크립트를
      실행 — seed 데이터가 아니라 진짜 API 경로로 검증됨(99/99 성공). 이 과정에서 실제
      업로드 플로우(`/upload` 페이지)에 라이선스 가격 입력 자체가 없어서 실제로 업로드한
      트랙은 영원히 구매 불가능(`License` 레코드가 아예 안 생김)이었던 진짜 버그를 발견해
      수정 — `CreateTrackSchema`에 `exclusivePrice`/`nonExclusivePrice` 추가, 업로드 폼에
      가격 입력 필드 2개 추가. (계정 생성 시 curl로 한글 이름을 셸 인자로 넘기다 인코딩이
      깨진 것도 발견 → UTF-8 JSON 파일로 넘기는 방식으로 재작업.)
- [x] PRD 요구사항 라벨(FR-XX/EC-XX/Section N) 사용자 화면에서 전부 제거 — 코드 주석에는
      남겨두되(개발 참고용), 실제 화면 텍스트/에러 메시지에서는 모두 삭제. 실제 제품처럼
      보이도록 하는 톤앤매너 정리의 연장선.
- [x] SoundCloud 참고 UI/UX 리뉴얼 — `GuideComparisonPlayer`를 SoundCloud 트랙 페이지처럼
      큰 원형 재생 버튼 + 틴트된 배경 + 두꺼운 라임 웨이브폼의 "히어로" 형태로 재작업.
      Discover 카드도 SoundCloud 타일처럼 정사각 그라데이션 아트워크(트랙 id 해시로
      결정론적 각도) + 장식용 웨이브폼 실루엣 + 호버 시 재생 버튼 오버레이로 변경.
      `src/app/globals.css`가 아니라 개별 컴포넌트 마크업을 직접 손댄 부분이라 위
      "테마/컴포넌트 토큰" 작업과는 별도 범위.
- [x] 실제 음원으로 시드 데이터 교체 — `Jade_Vol1` 폴더의 실제 창작곡 6곡을
      `public/uploads/tracks/`에 배치하고 `prisma/seed.ts`가 참조하도록 변경(더미
      `/demo/guide-*.wav` 제거). "미친도시_C_Hiphop"/"미친도시_R_Hiphop"처럼 같은 곡의
      랩 스타일이 다른 두 버전이 있어 가이드 A/B 비교 데모에 자연스럽게 맞아떨어짐.
- [x] 가이드 선택 상태 반영 (FR-03) — Split이 합의(AGREED)되면 그 Performer의 Guide는
      `SELECTED`, 같은 트랙의 다른 Guide는 전부 `REJECTED`로 자동 전이. 이전까지는
      `Guide.status`가 seed 데이터에만 존재하고 실제 플로우에서는 영원히 `PENDING`으로
      남아있던 죽은 필드였음 — 일반 협의 수락(`/api/splits/[id]/respond`)과 관리자 강제
      확정(`/api/admin/splits/[id]/resolve`) 양쪽 모두에 반영.
- [x] 구매 파일 다운로드 (`GET /api/orders/[id]/download`, Section 12) — 본인 주문만 허용,
      환불된 주문은 차단, 최초 다운로드 시 `Order.downloaded`를 true로 기록해
      `calculateRefund()`의 전액/부분 환불 분기가 실제로 의미를 갖게 함(이전까지는
      이 필드를 채우는 곳이 없어 관리자 환불 처리가 항상 "미다운로드=전액환불"로만
      동작했음). `/orders`에 다운로드 버튼 추가.
- [x] 관리자 페이지 (`/admin`) — `ADMIN` 역할 계정 전용(회원가입으로는 발급 불가, seed 데이터로만
      생성; 비-ADMIN 접근 시 404). `src/app/admin/layout.tsx`에서 역할 검사, `src/lib/admin.ts`의
      `requireAdmin()`을 모든 `/api/admin/*` 라우트에서 재사용.
  - **대시보드**(`/admin`): 유저 수, 노출 중인 트랙 수, 총 GMV·플랫폼 수수료 매출·에스크로
    보관액·정산 완료액, 보류(STALLED) Split/이의 제기(DISPUTED) 주문 건수.
  - **사용자 관리**(`/admin/users`): 역할 변경, 계정 정지(`User.suspended` — 정지 시
    `lib/auth.ts`의 `authorize()`에서 로그인 자체를 차단). 관리자 본인 계정은 API에서
    수정 차단(잠금 방지).
  - **트랙 모더레이션**(`/admin/tracks`): `Track.removedByAdmin` 토글 — 켜면 Discover 노출과
    신규 구매(`POST /api/orders`)에서 모두 제외.
  - **분쟁/보류 개입**(`/admin/disputes`): EC-05로 STALLED된 Split에 관리자가 직접 최종
    분배율을 입력해 확정(Track도 `SPLIT_AGREED`로 전이) — 그동안 미사용이던 `calculateRefund()`
    (`lib/fee.ts`)를 실제로 호출하는 첫 지점이기도 함: DISPUTED 주문을 정산 진행 또는
    환불(다운로드 여부에 따라 전액/부분) 처리.
  - 이번 작업에서 `User.suspended`·`Track.removedByAdmin`·`Order.downloaded` 3개 필드를
    추가(전부 `@default` 있어 백필 불필요). `Order.downloaded`는 `calculateRefund()`가
    처음부터 요구하던 파라미터였지만 이를 채워 넣는 곳이 없어 계속 죽은 코드였던 것.
- [x] 로그인 쿠키 버그 수정 — `AUTH_URL`을 cloudflared 터널의 `https://` 주소로 고정해두면
      Auth.js가 세션 쿠키를 `Secure`로 마킹해, 브라우저가 `http://localhost:3000`에서는 쿠키
      저장을 거부해 빠른 로그인이 서버 응답은 성공(302 + Set-Cookie)하고도 실제로는 로그인이
      안 되는 문제가 있었음. `auth.config.ts`(edge proxy)와 `lib/auth.ts`(Node) 양쪽에
      `useSecureCookies: NODE_ENV === "production"`을 동일하게 적용해 로컬(http)과 터널(https)
      모두에서 정상 동작하도록 수정.
- [x] 로그인 폼을 Server Action 기반으로 재작성 — 기존엔 `next-auth/react`의 `signIn()`을
      클라이언트 `onClick`/`onSubmit`에서 fetch로 호출했는데, 특정 브라우저 환경(확장 프로그램,
      hydration 실패 등)에서 클릭 자체가 반응하지 않는 문제가 재현됨. `src/app/login/actions.ts`의
      `loginAction`(`"use server"`)이 `lib/auth.ts`의 서버사이드 `signIn()`을 직접 호출하도록
      바꿔 진짜 HTML `<form action={...}>` POST로 동작 — 클라이언트 JS가 전혀 hydrate되지
      않아도 로그인이 되는지 raw multipart POST로 직접 검증함. 빠른 로그인 버튼도 클라이언트
      상태 대신 `/login?email=...` 쿼리 파라미터 + 서버 컴포넌트 `defaultValue`로 필드를
      채우는 방식으로 바꿔 동일하게 JS 비의존적으로 만듦.

- [x] 썸네일 업로드 — 트랙에 `thumbnailUrl` 추가, 기존 프리사인 업로드 파이프라인을
      `purpose: "thumbnail"`(별도 이미지 MIME/5MB 용량 검증)로 재사용. `/upload`에서 업로드
      시점에, `/studio`에서는 업로드 후에도 개별 트랙 썸네일을 다시 올릴 수 있음
      (`PATCH /api/tracks/[id]`). Discover/트랙 상세 카드에 실제 이미지로 렌더링(없으면
      기존 그라데이션 아트워크로 폴백).
- [x] 구매자 전곡 청취 제한 완전 삭제 — "구매자들이 들어보고 구매를 결정해야 한다"는
      피드백으로 `GuideComparisonPlayer`의 `previewOnly` 자체를 제거(더 이상 어떤 역할이든
      30초로 잘리지 않음). 캡션도 "30초까지만 미리듣기" → "전곡 청취 가능"으로 변경.
- [x] 닉네임 / 공개 표시명 선택 — `User.nickname` + `displayNickname`(boolean) 추가.
      `/register`에서 이름·이메일·비밀번호와 함께 닉네임을 받고, "닉네임으로 공개" 체크박스로
      선택. `src/lib/display-name.ts`의 `displayName(user)`가 이 값을 보고 실명/닉네임 중
      무엇을 보여줄지 결정 — Discover/트랙 상세 등 작성자가 공개 노출되는 모든 곳에서 재사용.
- [x] VOICE Cash 지갑/에스크로 시스템 (Section 12 결제 구조 재설계) — 실제 PG 없이 원화 1:1
      선불 캐시로 구매·정산을 처리하는 자체 원장 시스템. **"코인/화폐"라는 표현은 어디에도
      쓰지 않음**(가상자산/선불전자지급수단 관련 규제 리스크 회피 목적 — "캐시"/"포인트"로만
      표기).
  - `User.cashBalance`(원 단위 정수) + `CashTransaction`(append-only 원장, 매 건마다
    `balanceAfter` 스냅샷 기록 — TOPUP/PURCHASE/ESCROW_RELEASE/SETTLEMENT_PAYOUT/REFUND).
    `src/lib/cash.ts`의 `creditCash`/`debitCash`가 항상 `prisma.$transaction` 콜백 안에서만
    호출되도록 강제(잔액과 원장이 어긋날 수 없게).
  - **충전 → 구매**: `POST /api/orders`가 잔액 부족분(`shortfall`)만큼 자동 충전(TOPUP) 후
    전액 차감(PURCHASE) — 사용자가 별도로 충전 버튼을 누르지 않아도 구매가 끝까지 진행되는
    "auto top-up" UX. 물론 `/wallet`에서 직접 미리 충전(`POST /api/cash/topup`)도 가능.
  - **승인 → 자동 분배**: 에스크로 중인 주문을 구매자가 직접 승인(`POST /api/orders/[id]/approve`,
    `/orders`의 "구매 승인" 버튼)하거나 7일 경과 시 자동으로 `releaseEscrow()`
    (`src/lib/settlement.ts`)가 실행 — `lib/fee.ts`의 요율 그대로 수수료를 뗀 순수익을
    판매자(들)의 `cashBalance`에 즉시 크레딧.
  - **정산 신청 → 원화 출금**: `POST /api/settlements`가 KYC 미인증(`User.kycVerified`)이거나
    최소 정산액(5만원) 미만이면 차단, 통과 시 잔액 전액을 3.3% 원천징수 후 `SettlementRequest`
    (PENDING)로 전환. 실제 은행 송금은 앱 밖에서 수동으로 이뤄지고, 관리자가 `/admin/settlements`
    에서 "지급 완료 처리" 버튼으로 그 결과만 기록(`POST /api/admin/settlements/[id]/pay`).
  - KYC는 실제 신분증 수집 없이 관리자가 `/admin/users`에서 토글하는 boolean으로만
    구현(`kycVerified`) — 개인정보 처리 범위를 최소화하기 위한 의도적 목업.
  - `/wallet`(로그인 필요, `proxy.ts`/`auth.config.ts` 보호 경로에 추가): 잔액 카드, 충전 폼,
    정산 신청 버튼(KYC/최소액 미충족 시 사유 표시), 정산 신청 내역, 최근 거래내역 30건.
    헤더(`SiteHeader`)에도 로그인 시 잔액이 `/wallet` 링크로 항상 표시됨.
  - curl로 충전(자동)→구매→승인→분배→정산신청→관리자 지급완료 전체 플로우를 실제 raw HTTP
    요청으로 검증 완료(원 단위 계산까지 일치 확인: 12만원 구매 · 15% 수수료 → 10.2만원 정산
    → 3.3% 원천징수 → 98,634원 지급).
  - 실 은행 송금 연동, 세금계산서 발행, Cash 5년 만료/10% 환불 수수료 스윕 잡은 이번
    단계에서 의도적으로 범위 밖(문서화만 하고 미구현).

- [x] 트랙 수정 기능 — 업로드한 트랙을 나중에 고칠 수 있게 해달라는 요청으로 `/studio/[id]/edit`
      추가. 제목/장르/BPM/썸네일뿐 아니라 음원 파일 자체 교체(기존 업로드 파이프라인 재사용)와
      가사(`Track.lyrics`, 신규 필드)까지 전부 부분 수정 가능(`PATCH /api/tracks/[id]`, 보낸
      필드만 반영). 가사는 트랙 상세 페이지에도 노출.
- [x] 회원정보 수정 (`/settings/account`) — 헤더의 본인 이름(예: 김광석)을 클릭하면 진입.
      이름·닉네임·이메일 변경 + 공개 프로필에 이름/닉네임 중 무엇을 표시할지 라디오로 선택
      (`User.displayNickname`을 회원가입 때뿐 아니라 언제든 재설정 가능하게 됨 — Discover/트랙
      상세 등 `displayName()`을 쓰는 모든 화면에 즉시 반영됨을 확인). 비밀번호는 새로 설정하는
      값이 아니라 "본인 확인"용 필수 입력 — 로그인/회원가입과 같은 이유로 실제 form POST
      Server Action(`src/app/settings/account/actions.ts`)이고, 이메일 중복 체크 후 저장,
      성공 시 같은 자격증명으로 재로그인(`signIn()`)해서 세션(JWT) 안의 name/email도 즉시 갱신.
- [x] 개발용 cloudflared 터널 고정 포트를 3005 → **8080**으로 변경(로컬 포트 충돌 회피).
      이 과정에서 실제 버그를 하나 발견: `.env`의 `AUTH_URL`이 예전(재시작 전) 터널 주소로
      박제되어 있으면 로그인/회원정보수정 등 `signIn()`을 호출하는 모든 Server Action이 그
      죽은 주소로 리다이렉트해버려 세션이 깨짐 — 터널을 재시작할 때마다 `AUTH_URL`도 새
      주소로 같이 갱신해야 함(코드 주석에도 명시되어 있었지만 실제로 놓치기 쉬운 부분이라
      재발 방지 차 다시 기록).

- [x] 가격 수정 + 구매자 가격 흥정 — "가격도 등록자가 정하고 수정도 할 수 있어야, 구매자도
      흥정할 수 있어야" 요청으로 두 가지를 추가.
  - **가격 수정**: `/studio/[id]/edit`에 Exclusive/Non-Exclusive 가격 입력 필드 추가
    (`PATCH /api/tracks/[id]`가 해당 License 행을 갱신).
  - **가격 흥정**: `PriceOffer`/`PriceOfferLogEntry` 모델 신설 — Split 협의(제안/역제안/수락,
    역제안 3회 초과 시 STALLED로 관리자 개입)와 완전히 동일한 패턴. 트랙 상세 페이지에
    "가격 제안 / 흥정" 섹션 추가: 구매자는 라이선스별로 원하는 금액을 제안하고, 크리에이터는
    수락/거절/역제안으로 응답(`POST /api/offers`, `POST /api/offers/[id]/respond`). 마지막
    행위자는 다시 액션할 수 없음(턴제, Split과 동일). 수락되면 그 즉시 협의된 금액으로
    `Order`가 생성되어 에스크로에 진입 — 정가 구매(`POST /api/orders`)와 수수료·자동충전
    로직을 공유하도록 `src/lib/orders.ts`의 `createOrderAtPrice()`로 추출.
    `/admin/disputes`에 "보류된 가격 제안" 섹션 추가해 STALLED 건을 관리자가 최종 금액으로
    확정하거나 거절 처리 가능(`POST /api/admin/offers/[id]/resolve`). curl로 제안→역제안→
    수락 전체 플로우(협의 금액대로 정확히 Order 생성·수수료 계산됨)와 3회 초과 STALLED 전환,
    관리자 확정까지 전부 검증 완료.

- [x] 엔터테인먼트 서비스다운 비주얼 리뉴얼 — "기능은 다 있는데 화려함이 부족해 보인다"는
      피드백으로 3단계 순차 진행.
  1. **홈 화면**(`/`) — 정적 소개 문구만 있던 페이지를 실제 콘텐츠 랜딩으로 교체. 인기 1위
     트랙을 대형 히어로 배너(앨범 아트 배경 + 그라데이션 오버레이)로, 그 아래 "🔥 인기
     급상승"/"🆕 신규 업로드" 가로 스크롤 행 추가. 트랙이 하나도 없으면 기존 소개 문구로
     자동 폴백.
  2. **Discover**(`/discover`) — 세로 리스트 하나였던 걸 "쇼케이스"로 재구성: "✨ 지금
     주목할 트랙"(상위 3곡, 큰 카드) → "🔥 인기 급상승" 행 → 장르별 가로 스크롤 행(장르
     입력된 트랙만, 데이터가 쌓일수록 자연히 늘어나는 구조) → "전체 트랙" 그리드(기존
     방식 유지, 탐색 목적). 카드 렌더링 로직은 `src/components/track-tile.tsx`로 공유
     추출(Home/Discover 양쪽 사용, 그라데이션/웨이브폼 해시 로직은 `src/lib/track-visual.ts`).
  3. **플레이어**(`TrackPlayer`/`GuideComparisonPlayer`) — 재생 카드 배경에 앨범 아트를
     블러 처리해 깔고(없으면 트랙 id 기반 그라데이션), 재생 버튼을 크게 키우고 재생 중일 때
     네온 라임 글로우(`shadow-[0_0_36px_var(--primary)]`)를 주는 등 "지금 듣고 있다"는
     몰입감을 강화. 재생 로직(Howler/isPlayingRef)은 전혀 건드리지 않고 마크업/스타일만
     교체 — 순수 비주얼 변경.

- [x] 서비스 기획 고도화 (5단계 순차 진행) — "기능은 다 있는데 사람 중심 요소가 약하다"는
      방향으로 정체성(프로필) → 신뢰(리뷰) → 재방문(팔로우) → Performer 접근성(매칭 허브) →
      진입장벽 완화(브라우저 녹음) 순서로 진행.
  1. **공개 프로필**(`/u/[id]`) — Creator는 업로드 트랙·누적 재생·판매 건수·평점, Performer는
     제출 가이드 수·완료 콜라보 수를 포트폴리오처럼 보여줌. 트랙 상세 페이지의 크리에이터
     이름을 클릭하면 진입.
  2. **리뷰/평점**(`Review` 모델) — 정산 완료(SETTLED)된 주문에 한해 구매자가 별점(1-5)+
     후기를 남길 수 있음(`POST /api/reviews`, 주문 1건당 1개). 트랙 상세 페이지와 프로필
     페이지 양쪽에 평균 평점·리뷰 목록 노출. curl로 리뷰 작성→중복 작성 차단(409)까지 검증.
  3. **팔로우**(`Follow` 모델) — 프로필 페이지의 "+ 팔로우" 버튼. 팔로우한 크리에이터가
     신곡을 올리면 알림(`NEW_TRACK_FROM_FOLLOWED`) + 홈 화면 최상단에 "💚 팔로우 중인
     크리에이터의 신곡" 행 노출 — 재방문을 만드는 장치. curl로 팔로우→신곡 업로드→
     팔로워 알림 생성→홈 피드 노출까지 전체 플로우 검증.
  4. **가이드 모집 허브**(`/matching`) — 일반 Discover(구매 목적, 가격 우선 노출)와
     분리된 Performer 전용 탐색 페이지. 가격 대신 BPM/Key/무드/가사 유무·현재 가이드 수를
     보여주고, 가이드가 적은 트랙을 우선 노출해 아직 보컬이 없는 곡부터 채워지도록 함.
  5. **브라우저 마이크 녹음**(`GuideSubmitForm`) — 가이드 제출 시 "파일 업로드" 대신
     "🎙 지금 녹음하기" 모드 선택 가능. `MediaRecorder`로 브라우저에서 바로 녹음(webm/mp4/ogg,
     브라우저별로 지원 포맷이 달라 `MediaRecorder.isTypeSupported()`로 선택) → 미리듣기 →
     기존 프리사인 업로드 파이프라인 그대로 재사용해 제출. 녹음 장비·편집 경험이 없는
     아마추어의 진입장벽을 낮추는 게 목적이라 `lib/storage.ts`의 `ALLOWED_CONTENT_TYPES`에
     webm/mp4/ogg를 추가(기존 WAV/MP3 정책은 유지, 확장만).

- [x] 구매자 이의 제기(dispute) — 에스크로(`ESCROW`) 상태인 주문에 한해 구매자가 사유를
      남기고 이의를 제기할 수 있음(`POST /api/orders/[id]/dispute`, `/orders`의 "이의 제기"
      버튼). 관리자는 `/admin/disputes`에서 사유를 확인하고 정산 진행(SETTLE) 또는 환불
      (REFUND) 처리. **이 작업 중 기존 환불 로직의 실제 버그를 발견해 함께 고침** —
      `/api/admin/orders/[id]/resolve`의 REFUND 분기가 `calculateRefund()`로 환불액을
      계산해 응답에는 포함시키면서도 실제로는 구매자 VOICE Cash 잔액에 `creditCash()`를
      호출하지 않아, 주문 상태만 REFUNDED로 바뀌고 돈은 돌려주지 않는 상태였음.
- [x] 안읽은 알림 뱃지 — 헤더의 Inbox 메뉴에 안읽은 알림 수 뱃지(`SiteHeader`,
      `prisma.notification.count({ read: false })`). `/inbox` 진입 시 조회한 스냅샷으로
      먼저 렌더링한 뒤 DB에서 읽음 처리해, 뱃지가 사라지는 타이밍과 목록에 표시되는
      안읽음 점(`•`)이 어긋나지 않게 함.
- [x] 홈 화면 가로 스크롤 자동 재생 — "💚 팔로우 중인 신곡"/"🔥 인기 급상승"/"🆕 신규
      업로드" 세 행이 3.2초마다 한 칸씩 자동으로 넘어가고(`src/components/home/track-row.tsx`),
      끝에 닿으면 처음(또는 반대쪽)으로 부드럽게 복귀. 위아래 행이 서로 반대 방향으로
      흐르도록 `reverse` prop으로 교차 배치. hover/touch/focus 중에는 멈춰서 직접
      넘겨보는 걸 방해하지 않고, `prefers-reduced-motion`이 켜져 있으면 자동 재생 자체를
      비활성화.
- [x] 좋아요(Like) — 트랙 상세 페이지의 하트 버튼으로 좋아요/취소 토글
      (`Like` 모델, `POST /api/likes`, `DELETE /api/likes/[trackId]`). 로그인 사용자만
      노출.
- [x] 썸네일 자동 생성 — 썸네일이 없던 기존 트랙 90개에 카드 UI의 그라데이션+웨이브 바
      폴백과 동일한 스타일의 SVG 썸네일을 일괄 생성해 등록(`scripts/generate-thumbnails.ts`,
      트랙 id 기반 결정론적 해시로 매번 같은 비주얼 재현). CSS 커스텀 프로퍼티는 `<img>`로
      로드되는 별도 SVG 문서에 상속되지 않으므로 테마 색상(`--accent`/`--secondary`/
      `--primary`)을 하드코딩.
      **후속 수정** — 처음엔 그 시점에 있던 트랙만 채우는 1회성 백필이라, 이후 새로
      업로드/납품되는 트랙은 여전히 썸네일 없이 생성됐음. 생성 로직을
      `src/lib/generate-thumbnail.ts`로 뽑아내 `POST /api/tracks`·
      `POST /api/commissions/[id]/deliver` 양쪽에서 커버 이미지를 직접 올리지 않은 경우
      트랙 생성 시점에 바로 호출하도록 수정 — 이제 백필 스크립트를 다시 돌릴 필요 없음.
- [x] 곡 의뢰(Commission) — 기존 흐름(크리에이터가 곡을 먼저 올리고 구매자가 찾아서
      구매)과 반대로, 구매자가 원하는 조건(장르/무드/예산/마감일/레퍼런스)을 먼저 올리면
      크리에이터들이 가격+메시지로 지원하는 역방향 매칭(`CommissionRequest`/
      `CommissionOffer` 모델, `/commissions`).
  - 구매자가 지원 중 하나를 선정(`POST /api/commissions/[id]/select`)하면 의뢰는
    `MATCHED`로 전환되고, 선정된 크리에이터에게만 납품 권한이 생김. 나머지 지원은 자동
    `REJECTED` + 낙선 알림.
  - 선정된 크리에이터가 곡을 업로드해 납품(`POST /api/commissions/[id]/deliver`)하면
    그 즉시 합의된 가격으로 `License` + `Order`가 자동 생성되어 **기존 에스크로/수수료/
    자동충전 로직(`createOrderAtPrice`)을 그대로 재사용** — 별도의 결제 파이프라인을
    새로 만들지 않음.
  - 마감일이 지난 `OPEN` 의뢰는 목록 페이지 진입 시 lazy하게 `EXPIRED`로 전환
    (`settleExpiredEscrows()`와 동일한 패턴, `src/lib/commissions.ts`).

- [x] 서비스 고도화 2차 (3단계 순차 진행) — Creator 통계 대시보드에 이어 나머지 두
      역할/화면의 균형을 맞추는 방향.
  1. **관리자 통계 대시보드**(`/admin`) — 기존 GMV/수수료/에스크로 카드에 역할별 유저
     분포, 인기 장르 Top 5, 신규가입·GMV 14일 추이 차트 추가. 차트 컴포넌트를
     `src/components/mini-bar-chart.tsx`로 공유 추출해 Studio(Creator)와 Admin 양쪽이
     재사용.
  2. **Performer 대시보드** — Creator 전용이던 Studio(`/studio`)가 이제 로그인한
     역할에 따라 달라짐: Performer로 보면 제출한 가이드/채택된 콜라보/누적 정산 수익
     요약 카드 + 제출·수익 14일 추이 차트, 내 가이드 목록(상태 배지 포함)을 보여줌.
     수익은 `releaseEscrow()`가 Split 비율대로 적립하는 `CashTransaction`
     (`ESCROW_RELEASE`)을 근거로 집계해 실제 입금액과 정확히 일치.
  3. **곡 의뢰 취소 + 마감 임박 알림** — 만들 때 놓쳤던 두 시나리오 보완. 구매자가
     지원 모집 중(`OPEN`)인 의뢰를 취소하면 지원자 전원에게 알림이 가고 의뢰는
     `CANCELLED`로 전환(`POST /api/commissions/[id]/cancel`, 매칭 이후는 이미 크리에이터가
     작업을 시작했을 수 있어 취소 불가). 마감 24시간 이내로 다가온 `OPEN` 의뢰는
     구매자에게 1회만 알림(`deadlineNotifiedAt`으로 중복 발송 방지,
     `notifyUpcomingCommissionDeadlines()` — `settleExpiredEscrows()`와 동일하게 목록
     페이지 진입 시 lazy 실행).
- [x] 상단 메뉴 줄바꿈 수정 — 메뉴 항목이 늘면서(곡의뢰/좋아요 등) 중간폭 화면에서
      검색창과 폭을 다투다 항목 텍스트가 2줄로 꺾이던 문제. `whitespace-nowrap`으로
      줄바꿈을 막고, 검색창을 `lg` 이상 폭에서만 보이게(그 아래는 돋보기 아이콘) 밀어
      좁은 폭에서 메뉴가 우선 확보되도록 조정.

- [x] 서비스 고도화 3차 (3단계 순차 진행)
  1. **PWA(홈 화면 설치)** — `src/app/manifest.ts`, `src/app/icon.tsx`,
     `src/app/apple-icon.tsx` — Next App Router의 매니페스트/아이콘 파일 컨벤션으로
     `next/og`의 `ImageResponse`를 코드로 렌더링(헤더 로고와 동일한 디자인, 별도 이미지
     편집 툴/에셋 없이 재현 가능). `<link rel="manifest">`, `<link rel="icon">`,
     `<link rel="apple-touch-icon">`이 레이아웃 수정 없이 자동으로 `<head>`에 삽입됨.
     모바일에서 "홈 화면에 추가" 시 브라우저 주소창 없는 standalone 앱으로 실행.
  2. **에스크로 검수 리마인더** — 곡 의뢰 마감 임박 알림과 동일한 패턴(lazy 실행 + 1회성
     발송)을 주문에도 적용. 에스크로 종료 24시간 이내로 남았는데 구매자가 아직 검수/승인
     하지 않은 주문에 알림 1회 발송(`Order.escrowReminderSentAt`으로 중복 발송 방지,
     `notifyUpcomingEscrowReviews()`, `/orders` 진입 시 호출).
  3. **좋아요 많은 트랙 랭킹** — Discover 정렬 옵션에 "좋아요순" 추가(`orderBy: { likes:
     { _count: "desc" } }`), 좋아요가 1개 이상 쌓인 트랙이 있으면 기본 화면에
     "❤️ 좋아요 많은 트랙" 가로 스크롤 행이 자동으로 노출(0건일 땐 숨김 — 인기
     크리에이터 랭킹과 동일한 판단).

- [x] 가격 제안(PriceOffer) 만료 처리 — Commission/Order와 달리 무기한 대기 가능했던
      가격 흥정에도 동일한 lazy 리마인더 패턴 적용. 7일간 응답 없이 방치된 제안은
      `EXPIRED`로 전환(`expireStalePriceOffers()`), 만료 24시간 전엔 응답할 차례인 쪽
      (`lastActorId`가 아닌 쪽)에게 1회 알림(`notifyUpcomingPriceOfferExpirations()`,
      `/inbox` 진입 시 호출 — Offer는 전용 목록 페이지가 없어 가장 자주 방문하는
      전역 페이지에 걸어둠). `PriceOffer.updatedAt`(`@updatedAt`)을 새로 추가해 "마지막
      행위 시각" 기준으로 방치 여부를 판단.

- [x] 악보(sheet music) 등록/수정 — `Track.sheetMusicUrl`(PDF/JPEG/PNG, 최대 20MB).
      `/upload`(신규)·`/studio/[id]/edit`(수정) 양쪽에 업로드 UI 추가
      (`src/components/sheet-music-uploader.tsx` — 이미지 미리보기 대신 파일명+링크로
      표시, PDF도 다룰 수 있도록). 트랙 상세 페이지에서 가사와 동일하게 구매 전에도
      공개 — 가이드 제출을 검토하는 Performer가 참고할 수 있도록.

## 테스트 계정 (`npx prisma db seed` 실행 후)

모두 비밀번호 `password1234`:

| 이메일 | 역할 | 비고 |
|---|---|---|
| sasr10@naver.com | Creator | **실계정** (비밀번호 별도 — 데모 비밀번호 아님). 내러티브 트랙 3개 + 실제 업로드 카탈로그 보유 |
| seoah@voicemap.test | Performer | "미친도시" 가이드 A 제출 |
| minji@voicemap.test | Performer | "미친도시" 가이드 B + "어느 오래된 직장인의 건강생활" 가이드 |
| minsu@voicemap.test | Buyer (A&R) | 정산 완료 구매 이력 보유, "미친도시" 이의 제기 주문 보유 |
| admin@voicemap.test | Admin | `/admin` 접근 가능. "Waiting Room" Split이 STALLED 상태로 시딩되어 분쟁 개입 데모 가능 |

DB를 직접 보려면: `npx prisma studio` (http://localhost:5555)
