/*
  Warnings:

  - Added the required column `lastActorId` to the `Split` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Split" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "performerId" TEXT NOT NULL,
    "creatorShare" REAL NOT NULL DEFAULT 80,
    "performerShare" REAL NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "counterCount" INTEGER NOT NULL DEFAULT 0,
    "lastActorId" TEXT NOT NULL,
    "agreedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Split_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Split_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Split_lastActorId_fkey" FOREIGN KEY ("lastActorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- lastActorId backfill for the 2 pre-existing dev-seed rows (reseed after this migration
-- to get real values going forward; see the sibling add_split_performer migration for why
-- this is hardcoded to this migration's authoring-time dev.db contents).
INSERT INTO "new_Split" ("agreedAt", "counterCount", "createdAt", "creatorShare", "id", "lastActorId", "performerId", "performerShare", "status", "trackId")
SELECT "agreedAt", "counterCount", "createdAt", "creatorShare", "id",
  CASE "id"
    WHEN 'cmtk2rid6000nbgtkxc2w360n' THEN 'cmtk2ribp0000bgtkjl15u5uk' -- 여름밤, 우리 split -> last actor 지훈 (ACCEPT)
    WHEN 'cmtk2ride000sbgtkzkotb93w' THEN 'cmtk2ric30002bgtkq5w00xoh' -- Neon Drive split -> last actor 민지
  END,
  "performerId", "performerShare", "status", "trackId" FROM "Split";
DROP TABLE "Split";
ALTER TABLE "new_Split" RENAME TO "Split";
CREATE UNIQUE INDEX "Split_trackId_key" ON "Split"("trackId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
