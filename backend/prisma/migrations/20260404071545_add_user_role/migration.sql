-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetCode" TEXT,
ADD COLUMN     "resetCodeExpiry" TIMESTAMP(3),
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';
