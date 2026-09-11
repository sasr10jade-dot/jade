-- CreateEnum
CREATE TYPE "CashTopupRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAction" ADD VALUE 'DEPOSIT_CONFIRMED';
ALTER TYPE "AdminAction" ADD VALUE 'DEPOSIT_REJECTED';

-- CreateTable
CREATE TABLE "CashTopupRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "depositorName" TEXT NOT NULL,
    "status" "CashTopupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,

    CONSTRAINT "CashTopupRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CashTopupRequest" ADD CONSTRAINT "CashTopupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
