/*
  Warnings:

  - You are about to drop the column `avatarUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `interests` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AvatarStyle" AS ENUM ('ORB', 'CREST', 'MONOGRAM');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('EARLY_MORNING', 'MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "ChallengeLevel" AS ENUM ('GENTLE', 'BALANCED', 'AMBITIOUS');

-- CreateEnum
CREATE TYPE "MovementOption" AS ENUM ('GYM', 'HOME_WORKOUT', 'WALKING', 'RUNNING', 'CYCLING', 'SPORTS', 'YOGA_MOBILITY', 'OUTDOORS');

-- CreateEnum
CREATE TYPE "LearningFormat" AS ENUM ('READING', 'VIDEO', 'AUDIO', 'HANDS_ON', 'COURSES', 'AI_LESSONS');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatarUrl",
DROP COLUMN "interests",
ADD COLUMN     "pronouns" TEXT;

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "motto" TEXT,
    "avatarStyle" "AvatarStyle" NOT NULL DEFAULT 'ORB',
    "avatarColor" TEXT NOT NULL DEFAULT 'violet',
    "avatarEmblem" TEXT NOT NULL DEFAULT 'sprout',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyMinutes" INTEGER NOT NULL DEFAULT 60,
    "preferredTimeOfDay" "TimeOfDay" NOT NULL DEFAULT 'FLEXIBLE',
    "challengeLevel" "ChallengeLevel" NOT NULL DEFAULT 'BALANCED',
    "movementOptions" "MovementOption"[],
    "learningFormats" "LearningFormat"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lifeArea" "LifeArea",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLifeArea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lifeArea" "LifeArea" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFocus" BOOLEAN NOT NULL DEFAULT false,
    "focusRank" INTEGER,
    "intention" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLifeArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_key" ON "Character"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_userId_slug_key" ON "UserInterest"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserLifeArea_userId_lifeArea_key" ON "UserLifeArea"("userId", "lifeArea");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLifeArea" ADD CONSTRAINT "UserLifeArea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
