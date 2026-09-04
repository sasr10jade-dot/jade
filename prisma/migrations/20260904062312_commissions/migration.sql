-- CreateTable
CREATE TABLE "CommissionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "genre" TEXT,
    "mood" TEXT,
    "referenceUrl" TEXT,
    "budgetMin" INTEGER NOT NULL,
    "budgetMax" INTEGER NOT NULL,
    "licenseType" TEXT NOT NULL,
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommissionOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionOffer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommissionRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommissionOffer_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "removedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatorId" TEXT NOT NULL,
    "commissionRequestId" TEXT,
    CONSTRAINT "Track_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Track_commissionRequestId_fkey" FOREIGN KEY ("commissionRequestId") REFERENCES "CommissionRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("bpm", "bpmAuto", "createdAt", "creatorId", "fileSize", "fileUrl", "genre", "id", "key", "keyAuto", "lyrics", "mood", "playCount", "removedByAdmin", "status", "tags", "thumbnailUrl", "title") SELECT "bpm", "bpmAuto", "createdAt", "creatorId", "fileSize", "fileUrl", "genre", "id", "key", "keyAuto", "lyrics", "mood", "playCount", "removedByAdmin", "status", "tags", "thumbnailUrl", "title" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE UNIQUE INDEX "Track_commissionRequestId_key" ON "Track"("commissionRequestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CommissionOffer_requestId_creatorId_key" ON "CommissionOffer"("requestId", "creatorId");
