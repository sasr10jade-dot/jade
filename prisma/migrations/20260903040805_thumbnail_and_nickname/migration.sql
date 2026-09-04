-- AlterTable
ALTER TABLE "Track" ADD COLUMN "thumbnailUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "displayNickname" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSeedCreator" BOOLEAN NOT NULL DEFAULT false,
    "seedPromoUntil" DATETIME
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isSeedCreator", "name", "passwordHash", "role", "seedPromoUntil", "suspended") SELECT "createdAt", "email", "id", "isSeedCreator", "name", "passwordHash", "role", "seedPromoUntil", "suspended" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
