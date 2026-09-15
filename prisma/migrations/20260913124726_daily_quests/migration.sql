-- CreateEnum
CREATE TYPE "DayEnergy" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "QuestStatus" ADD VALUE 'DEFERRED';

-- DropIndex
DROP INDEX "Quest_dailyQuestSetId_idx";

-- AlterTable
ALTER TABLE "DailyQuestSet" ADD COLUMN     "energy" "DayEnergy" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "generator" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "carriedFromId" TEXT,
ADD COLUMN     "isCore" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "skipReason" TEXT,
ADD COLUMN     "skippedAt" TIMESTAMP(3),
ADD COLUMN     "slot" TEXT NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "steps" TEXT[],
ADD COLUMN     "swapCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "templateKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuestCompletion" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "xpReward" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Quest_carriedFromId_key" ON "Quest"("carriedFromId");

-- CreateIndex
CREATE INDEX "Quest_userId_templateKey_idx" ON "Quest"("userId", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_dailyQuestSetId_slot_key" ON "Quest"("dailyQuestSetId", "slot");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_carriedFromId_fkey" FOREIGN KEY ("carriedFromId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

