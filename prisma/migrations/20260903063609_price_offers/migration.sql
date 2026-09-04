-- CreateTable
CREATE TABLE "PriceOffer" (
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
    CONSTRAINT "PriceOffer_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOffer_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOffer_lastActorId_fkey" FOREIGN KEY ("lastActorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOffer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceOfferLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceOfferLogEntry_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PriceOffer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceOfferLogEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceOffer_orderId_key" ON "PriceOffer"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceOffer_trackId_licenseId_buyerId_key" ON "PriceOffer"("trackId", "licenseId", "buyerId");
