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
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "removedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Track_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("bpm", "bpmAuto", "createdAt", "creatorId", "fileSize", "fileUrl", "genre", "id", "key", "keyAuto", "mood", "removedByAdmin", "status", "tags", "title") SELECT "bpm", "bpmAuto", "createdAt", "creatorId", "fileSize", "fileUrl", "genre", "id", "key", "keyAuto", "mood", "removedByAdmin", "status", "tags", "title" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
