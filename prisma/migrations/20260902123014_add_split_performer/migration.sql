/*
  Warnings:

  - Added the required column `performerId` to the `Split` table without a default value. This is not possible if the table is not empty.

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
    "agreedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Split_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Split_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- performerId backfill for the 2 pre-existing dev-seed rows (no FK-safe default exists
-- for a required column added after the table had data); matches this migration's
-- authoring-time dev.db contents exactly. Fine to reseed (`npx prisma db seed`) after.
INSERT INTO "new_Split" ("agreedAt", "counterCount", "createdAt", "creatorShare", "id", "performerId", "performerShare", "status", "trackId")
SELECT "agreedAt", "counterCount", "createdAt", "creatorShare", "id",
  CASE "id"
    WHEN 'cmtjzoxdh000nbgzcktbe7kc4' THEN 'cmtjzoxbr0001bgzcf12jptbf' -- 여름밤, 우리 -> 서아
    WHEN 'cmtjzoxdu000sbgzc9s8inodi' THEN 'cmtjzoxbx0002bgzcxggeidjg' -- Neon Drive -> 민지
  END,
  "performerShare", "status", "trackId" FROM "Split";
DROP TABLE "Split";
ALTER TABLE "new_Split" RENAME TO "Split";
CREATE UNIQUE INDEX "Split_trackId_key" ON "Split"("trackId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
