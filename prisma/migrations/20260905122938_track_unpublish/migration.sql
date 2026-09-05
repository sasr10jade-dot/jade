-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "bpm" INTEGER,
    "bpmAuto" BOOLEAN NOT NULL DEFAULT true,
    "key" TEXT,
    "keyAuto" BOOLEAN NOT NULL DEFAULT true,
    "genre" TEXT,
    "mood" TEXT,
    "tags" TEXT,
    "lyrics" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "thumbnailUrl" TEXT,
    "sheetMusicUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "removedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "removedByCreator" BOOLEAN NOT NULL DEFAULT false,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatorId" TEXT NOT NULL,
    "commissionRequestId" TEXT,
    CONSTRAINT "Track_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Track_commissionRequestId_fkey" FOREIGN KEY ("commissionRequestId") REFERENCES "CommissionRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("bpm", "bpmAuto", "commissionRequestId", "createdAt", "creatorId", "fileSize", "fileUrl", "genre", "id", "key", "keyAuto", "lyrics", "mood", "playCount", "removedByAdmin", "sheetMusicUrl", "status", "tags", "thumbnailUrl", "title") SELECT "bpm", "bpmAuto", "commissionRequestId", "createdAt", "creatorId", "fileSize", "fileUrl", "genre", "id", "key", "keyAuto", "lyrics", "mood", "playCount", "removedByAdmin", "sheetMusicUrl", "status", "tags", "thumbnailUrl", "title" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE UNIQUE INDEX "Track_commissionRequestId_key" ON "Track"("commissionRequestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
