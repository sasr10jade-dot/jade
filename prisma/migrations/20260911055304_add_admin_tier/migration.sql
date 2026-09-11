-- CreateEnum
CREATE TYPE "AdminTier" AS ENUM ('SUPER', 'OPERATOR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAction" ADD VALUE 'ADMIN_ACCESS_GRANTED';
ALTER TYPE "AdminAction" ADD VALUE 'ADMIN_ACCESS_REVOKED';
ALTER TYPE "AdminAction" ADD VALUE 'ADMIN_TIER_CHANGED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminTier" "AdminTier",
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;
