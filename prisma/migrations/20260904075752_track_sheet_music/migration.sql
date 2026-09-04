-- AlterTable
ALTER TABLE "Track" ADD COLUMN "sheetMusicUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PriceOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "counterCount" INTEGER NOT NULL DEFAULT 0,
    "lastActorId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiryReminderSentAt" DATETIME,
    CONSTRAINT "PriceOffer_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOffer_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOffer_lastActorId_fkey" FOREIGN KEY ("lastActorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOffer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PriceOffer" ("amount", "buyerId", "counterCount", "createdAt", "expiryReminderSentAt", "id", "lastActorId", "licenseId", "orderId", "status", "trackId", "updatedAt") SELECT "amount", "buyerId", "counterCount", "createdAt", "expiryReminderSentAt", "id", "lastActorId", "licenseId", "orderId", "status", "trackId", "updatedAt" FROM "PriceOffer";
DROP TABLE "PriceOffer";
ALTER TABLE "new_PriceOffer" RENAME TO "PriceOffer";
CREATE UNIQUE INDEX "PriceOffer_orderId_key" ON "PriceOffer"("orderId");
CREATE UNIQUE INDEX "PriceOffer_trackId_licenseId_buyerId_key" ON "PriceOffer"("trackId", "licenseId", "buyerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
