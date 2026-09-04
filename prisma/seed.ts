/**
 * Dev seed data — demo narrative (서아 / 민지 / 민수 A&R + 실계정 김광석), now as real rows
 * so every page can query Prisma instead of src/lib/mock-data.ts.
 *
 * IMPORTANT: 김광석(sasr10@naver.com)은 실제 사용자 계정이고 99곡의 실제 업로드 카탈로그를
 * 소유하고 있음. 이 스크립트는 그 계정과 그 카탈로그를 절대 건드리지 않는다 — upsert로
 * 찾아 쓰기만 하고(update: {}, 비밀번호/이름 등 덮어쓰지 않음), 정리(cleanup)도 아래 3개
 * 데모 내러티브 트랙 제목 + 나머지 가짜 데모 계정(서아/민지/민수/관리자)에만 한정된다.
 * 재실행 가능(re-runnable)하지만 실사용자 데이터는 절대 삭제/초기화하지 않는다.
 *
 * Run with: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password1234";
const CREATOR_EMAIL = "sasr10@naver.com";
const CREATOR_PASSWORD = "kk101312!@";
const DEMO_EMAILS: string[] = [
  "seoah@voicemap.test",
  "minji@voicemap.test",
  "minsu@voicemap.test",
  "admin@voicemap.test",
];
const NARRATIVE_TRACK_TITLES = ["미친도시", "어느 오래된 직장인의 건강생활", "Chaos Knights"];

async function main() {
  console.log("Seeding (scoped — real creator account/catalog untouched)...");

  const staleDemoUsers = await prisma.user.findMany({ where: { email: { in: DEMO_EMAILS } } });
  const staleDemoUserIds = staleDemoUsers.map((u) => u.id);
  const staleNarrativeTracks = await prisma.track.findMany({
    where: { title: { in: NARRATIVE_TRACK_TITLES } },
  });
  const staleNarrativeTrackIds = staleNarrativeTracks.map((t) => t.id);

  // Scoped clean slate (children first, FK order) — only rows tied to the throwaway
  // demo personas or the 3 narrative tracks, never the real creator's other tracks.
  await prisma.notification.deleteMany({
    where: { OR: [{ userId: { in: staleDemoUserIds } }, { fromUserId: { in: staleDemoUserIds } }] },
  });
  await prisma.order.deleteMany({
    where: { OR: [{ buyerId: { in: staleDemoUserIds } }, { trackId: { in: staleNarrativeTrackIds } }] },
  });
  await prisma.license.deleteMany({ where: { trackId: { in: staleNarrativeTrackIds } } });
  await prisma.splitLogEntry.deleteMany({
    where: {
      OR: [
        { actorId: { in: staleDemoUserIds } },
        { split: { trackId: { in: staleNarrativeTrackIds } } },
      ],
    },
  });
  await prisma.split.deleteMany({ where: { trackId: { in: staleNarrativeTrackIds } } });
  await prisma.guide.deleteMany({
    where: { OR: [{ performerId: { in: staleDemoUserIds } }, { trackId: { in: staleNarrativeTrackIds } }] },
  });
  await prisma.track.deleteMany({ where: { id: { in: staleNarrativeTrackIds } } });
  await prisma.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 실계정 — 있으면 그대로 두고(update: {}) 없으면(신규 클론 등) 실제 비밀번호로 생성.
  const jade = await prisma.user.upsert({
    where: { email: CREATOR_EMAIL },
    update: {},
    create: {
      name: "김광석",
      email: CREATOR_EMAIL,
      passwordHash: await bcrypt.hash(CREATOR_PASSWORD, 10),
      role: "CREATOR",
    },
  });
  const seoah = await prisma.user.create({
    data: { name: "서아", email: "seoah@voicemap.test", passwordHash, role: "PERFORMER" },
  });
  const minji = await prisma.user.create({
    data: { name: "민지", email: "minji@voicemap.test", passwordHash, role: "PERFORMER" },
  });
  const minsu = await prisma.user.create({
    data: { name: "민수", email: "minsu@voicemap.test", passwordHash, role: "BUYER" },
  });
  await prisma.user.create({
    data: { name: "관리자", email: "admin@voicemap.test", passwordHash, role: "ADMIN" },
  });

  // --- Tracks + Licenses (Discover / Checkout pricing) ---
  // 실제 Jade 작사/작곡 음원(C:\...\Jade_Vol1)에서 발췌해 public/uploads/tracks/에 배치.
  // "미친도시"는 동일 곡의 두 가지 랩 스타일 버전이 있어 가이드 A/B 비교 데모에 그대로 활용.
  const summerNight = await prisma.track.create({
    data: {
      title: "미친도시",
      bpm: 92,
      bpmAuto: false,
      key: "F Minor",
      keyAuto: false,
      genre: "힙합",
      mood: "다크한",
      tags: "힙합,무드: 다크한,랩 보컬 추천",
      fileUrl: "/uploads/tracks/michindosi-c-hiphop.mp3",
      fileSize: 8417716,
      status: "SPLIT_AGREED",
      creatorId: jade.id,
      licenses: {
        create: [
          { type: "EXCLUSIVE", price: 800000 },
          { type: "NON_EXCLUSIVE", price: 300000 },
        ],
      },
    },
  });
  const neonDrive = await prisma.track.create({
    data: {
      title: "어느 오래된 직장인의 건강생활",
      bpm: 132,
      key: "E Minor",
      genre: "락",
      mood: "에너제틱",
      tags: "락,에너제틱",
      fileUrl: "/uploads/tracks/oldjikjang-health-hardrock.mp3",
      fileSize: 3680581,
      status: "MATCHING",
      creatorId: jade.id,
      licenses: {
        create: [
          { type: "EXCLUSIVE", price: 450000 },
          { type: "NON_EXCLUSIVE", price: 180000 },
        ],
      },
    },
  });
  const waitingRoom = await prisma.track.create({
    data: {
      title: "Chaos Knights",
      bpm: 110,
      key: "D Minor",
      genre: "시네마틱",
      mood: "웅장한",
      tags: "시네마틱,웅장한",
      fileUrl: "/uploads/tracks/chaos-knights-theme1.mp3",
      fileSize: 7172445,
      status: "MATCHING",
      creatorId: jade.id,
      licenses: {
        create: [
          { type: "EXCLUSIVE", price: 300000 },
          { type: "NON_EXCLUSIVE", price: 120000 },
        ],
      },
    },
  });

  // --- Guides (가이드 비교) ---
  await prisma.guide.create({
    data: {
      trackId: summerNight.id,
      performerId: seoah.id,
      audioUrl: "/uploads/tracks/michindosi-c-hiphop.mp3",
      splitAsk: 20,
      status: "SELECTED",
    },
  });
  await prisma.guide.create({
    data: {
      trackId: summerNight.id,
      performerId: minji.id,
      audioUrl: "/uploads/tracks/michindosi-r-hiphop.mp3",
      splitAsk: 25,
      status: "REJECTED",
    },
  });
  await prisma.guide.create({
    data: {
      trackId: neonDrive.id,
      performerId: minji.id,
      audioUrl: "/uploads/tracks/oldjikjang-health-metal.mp3",
      splitAsk: 25,
      status: "PENDING",
    },
  });
  await prisma.guide.create({
    data: {
      trackId: waitingRoom.id,
      performerId: seoah.id,
      audioUrl: "/uploads/tracks/oldjikjang-health-country.mp3",
      splitAsk: 24,
      status: "PENDING",
    },
  });

  // --- Split + log (합의 로그) ---
  const split = await prisma.split.create({
    data: {
      trackId: summerNight.id,
      performerId: seoah.id,
      creatorShare: 80,
      performerShare: 20,
      status: "AGREED",
      counterCount: 1,
      agreedAt: new Date(),
      lastActorId: jade.id, // last real action was jade's ACCEPT
    },
  });
  await prisma.splitLogEntry.createMany({
    data: [
      { splitId: split.id, actorId: jade.id, action: "PROPOSE", creatorShare: 80, performerShare: 20 },
      { splitId: split.id, actorId: seoah.id, action: "COUNTER", creatorShare: 75, performerShare: 25 },
      { splitId: split.id, actorId: jade.id, action: "ACCEPT", creatorShare: 80, performerShare: 20 },
    ],
  });
  const neonDriveSplit = await prisma.split.create({
    data: {
      trackId: neonDrive.id,
      performerId: minji.id,
      creatorShare: 75,
      performerShare: 25,
      status: "COUNTERED",
      counterCount: 1,
      lastActorId: minji.id, // last action was minji's COUNTER; jade must respond next
    },
  });
  await prisma.splitLogEntry.createMany({
    data: [
      { splitId: neonDriveSplit.id, actorId: jade.id, action: "PROPOSE", creatorShare: 80, performerShare: 20 },
      { splitId: neonDriveSplit.id, actorId: minji.id, action: "COUNTER", creatorShare: 75, performerShare: 25 },
    ],
  });

  // --- Stalled Split (역제안 3회 초과, 관리자 개입 대상) ---
  const waitingRoomSplit = await prisma.split.create({
    data: {
      trackId: waitingRoom.id,
      performerId: seoah.id,
      creatorShare: 74,
      performerShare: 26,
      status: "STALLED",
      counterCount: 3,
      lastActorId: seoah.id,
    },
  });
  await prisma.splitLogEntry.createMany({
    data: [
      { splitId: waitingRoomSplit.id, actorId: jade.id, action: "PROPOSE", creatorShare: 80, performerShare: 20 },
      { splitId: waitingRoomSplit.id, actorId: seoah.id, action: "COUNTER", creatorShare: 70, performerShare: 30 },
      { splitId: waitingRoomSplit.id, actorId: jade.id, action: "COUNTER", creatorShare: 78, performerShare: 22 },
      { splitId: waitingRoomSplit.id, actorId: seoah.id, action: "COUNTER", creatorShare: 74, performerShare: 26 },
    ],
  });

  // --- Notifications (Inbox) ---
  await prisma.notification.createMany({
    data: [
      {
        userId: jade.id,
        fromUserId: seoah.id,
        type: "GUIDE_SUBMITTED",
        message: "가이드 제출: 미친도시에 가이드를 제출했어요",
      },
      {
        userId: jade.id,
        fromUserId: minji.id,
        type: "SPLIT_COUNTERED",
        message: "Split 역제안: 75 / 25로 제안합니다",
      },
      {
        userId: jade.id,
        fromUserId: minsu.id,
        type: "TRACK_INQUIRY",
        message: "곡 문의: 이 트랙 Exclusive로 구매 가능한가요?",
      },
    ],
  });

  // --- One past order (정산 내역 예시) ---
  await prisma.order.create({
    data: {
      trackId: neonDrive.id,
      licenseId: (await prisma.license.findFirstOrThrow({
        where: { trackId: neonDrive.id, type: "NON_EXCLUSIVE" },
      })).id,
      buyerId: minsu.id,
      amount: 180000,
      feeRate: 0.15,
      feeAmount: 27000,
      netAmount: 153000,
      status: "SETTLED",
      settledAt: new Date(),
    },
  });

  // --- One disputed order (관리자 개입 예시) ---
  await prisma.order.create({
    data: {
      trackId: summerNight.id,
      licenseId: (await prisma.license.findFirstOrThrow({
        where: { trackId: summerNight.id, type: "NON_EXCLUSIVE" },
      })).id,
      buyerId: minsu.id,
      amount: 300000,
      feeRate: 0.1,
      feeAmount: 30000,
      netAmount: 270000,
      status: "DISPUTED",
      downloaded: false,
    },
  });

  // --- One order past its escrow window (자동 정산 데모, lib/settlement.ts) ---
  // 아직 아무 페이지도 렌더링되지 않았으니 ESCROW로 시딩 — /orders, /studio, /admin
  // 중 아무 곳이나 처음 열리는 순간 settleExpiredEscrows()가 SETTLED로 바꿔준다.
  await prisma.order.create({
    data: {
      trackId: waitingRoom.id,
      licenseId: (await prisma.license.findFirstOrThrow({
        where: { trackId: waitingRoom.id, type: "EXCLUSIVE" },
      })).id,
      buyerId: minsu.id,
      amount: 300000,
      feeRate: 0.2,
      feeAmount: 60000,
      netAmount: 240000,
      status: "ESCROW",
      purchasedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      escrowEndsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  const catalogCount = await prisma.track.count({ where: { creatorId: jade.id } });

  console.log("Seeded:");
  console.log(`  실계정: 김광석(Creator, ${CREATOR_EMAIL}) — 데모 계정: 서아/민지(Performer) 민수(Buyer) 관리자(Admin), 비밀번호: ${DEMO_PASSWORD}`);
  console.log(`  내러티브 트랙: ${summerNight.title}, ${neonDrive.title}, ${waitingRoom.title}`);
  console.log(`  김광석 전체 트랙 수(실 업로드 카탈로그 포함): ${catalogCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
