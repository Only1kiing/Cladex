-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "nextBillingDate" TIMESTAMP(3),
ADD COLUMN     "sourceAgentId" TEXT,
ADD COLUMN     "subscriptionPrice" DOUBLE PRECISION,
ADD COLUMN     "subscriptionStatus" TEXT;
