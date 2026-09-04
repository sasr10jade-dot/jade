-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "feeRate" REAL NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ESCROW',
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "escrowEndsAt" DATETIME,
    "settledAt" DATETIME,
    CONSTRAINT "Order_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("amount", "buyerId", "escrowEndsAt", "feeAmount", "feeRate", "id", "licenseId", "netAmount", "purchasedAt", "settledAt", "status", "trackId") SELECT "amount", "buyerId", "escrowEndsAt", "feeAmount", "feeRate", "id", "licenseId", "netAmount", "purchasedAt", "settledAt", "status", "trackId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Track_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("bpm", "bpmAuto", "createdAt", "creatorId", "fileSize", "fileUrl", "genre", "id", "key", "keyAuto", "mood", "status", "tags", "title") SELECT "bpm", "bpmAuto", "createdAt", "creatorId", "fileSize", "fileUrl", "genre", "id", "key", "keyAuto", "mood", "status", "tags", "title" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSeedCreator" BOOLEAN NOT NULL DEFAULT false,
    "seedPromoUntil" DATETIME
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isSeedCreator", "name", "passwordHash", "role", "seedPromoUntil") SELECT "createdAt", "email", "id", "isSeedCreator", "name", "passwordHash", "role", "seedPromoUntil" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
