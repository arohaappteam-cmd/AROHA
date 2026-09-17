-- CreateEnum
CREATE TYPE "DayMood" AS ENUM ('ROUGH', 'OKAY', 'GOOD', 'GREAT');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('ACTIVE', 'REVIEW_DUE', 'REVIEWED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ExperimentImprovement" AS ENUM ('NOT_REALLY', 'A_LITTLE', 'NOTICEABLY', 'A_LOT');

-- CreateEnum
CREATE TYPE "ExperimentDecision" AS ENUM ('MAKE_IT_A_GOAL', 'KEEP_EXPLORING', 'NOT_FOR_NOW');

-- AlterEnum
ALTER TYPE "XpSourceType" ADD VALUE 'EXPERIMENT_COMPLETION';

-- AlterTable
ALTER TABLE "Reflection" ADD COLUMN     "aiSuggestion" TEXT,
ADD COLUMN     "differently" TEXT,
ADD COLUMN     "mood" "DayMood",
ADD COLUMN     "proud" TEXT,
ADD COLUMN     "summarizedAt" TIMESTAMP(3),
ADD COLUMN     "summarySource" TEXT;

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "mood" "DayMood",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🧪',
    "lifeArea" "LifeArea" NOT NULL,
    "skillTree" TEXT,
    "durationDays" INTEGER NOT NULL,
    "dailyMinutes" INTEGER NOT NULL DEFAULT 20,
    "startDate" DATE NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'ACTIVE',
    "endedAt" TIMESTAMP(3),
    "enjoyment" INTEGER,
    "interest" INTEGER,
    "improvement" "ExperimentImprovement",
    "decision" "ExperimentDecision",
    "learned" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentDay" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "questId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalEntry_userId_date_idx" ON "JournalEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "Experiment_userId_status_idx" ON "Experiment"("userId", "status");

-- CreateIndex
CREATE INDEX "ExperimentDay_userId_questId_idx" ON "ExperimentDay"("userId", "questId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentDay_experimentId_date_key" ON "ExperimentDay"("experimentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Reflection_userId_kind_date_key" ON "Reflection"("userId", "kind", "date");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentDay" ADD CONSTRAINT "ExperimentDay_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

