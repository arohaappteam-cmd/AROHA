-- CreateEnum
CREATE TYPE "SocialVisibility" AS ENUM ('PRIVATE', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "MentorshipRole" AS ENUM ('MENTEE', 'MENTOR');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "SocialProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visibility" "SocialVisibility" NOT NULL DEFAULT 'PRIVATE',
    "headline" TEXT,
    "showLevel" BOOLEAN NOT NULL DEFAULT true,
    "showSkills" BOOLEAN NOT NULL DEFAULT true,
    "showAchievements" BOOLEAN NOT NULL DEFAULT true,
    "onLeaderboards" BOOLEAN NOT NULL DEFAULT false,
    "openToMentoring" BOOLEAN NOT NULL DEFAULT false,
    "seekingMentor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildSlug" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupChallengeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "challengeId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupChallengeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentorship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MentorshipRole" NOT NULL,
    "counterpartHandle" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Mentorship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialProfile_userId_key" ON "SocialProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMembership_userId_guildSlug_key" ON "GuildMembership"("userId", "guildSlug");

-- CreateIndex
CREATE UNIQUE INDEX "GroupChallengeEntry_userId_groupKey_key" ON "GroupChallengeEntry"("userId", "groupKey");

-- CreateIndex
CREATE INDEX "Mentorship_userId_status_idx" ON "Mentorship"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Mentorship_userId_role_counterpartHandle_key" ON "Mentorship"("userId", "role", "counterpartHandle");

-- AddForeignKey
ALTER TABLE "SocialProfile" ADD CONSTRAINT "SocialProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupChallengeEntry" ADD CONSTRAINT "GroupChallengeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupChallengeEntry" ADD CONSTRAINT "GroupChallengeEntry_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
