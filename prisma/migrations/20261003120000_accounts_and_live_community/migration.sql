-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MentorshipStatus" ADD VALUE 'PENDING';
ALTER TYPE "MentorshipStatus" ADD VALUE 'DECLINED';

-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "counterpartId" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authId" TEXT,
ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "MentorshipMessage" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorshipMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorshipMessage_mentorshipId_createdAt_idx" ON "MentorshipMessage"("mentorshipId", "createdAt");

-- CreateIndex
CREATE INDEX "GroupChallengeEntry_groupKey_idx" ON "GroupChallengeEntry"("groupKey");

-- CreateIndex
CREATE INDEX "GuildMembership_guildSlug_idx" ON "GuildMembership"("guildSlug");

-- CreateIndex
CREATE INDEX "Mentorship_counterpartId_status_idx" ON "Mentorship"("counterpartId", "status");

-- CreateIndex
CREATE INDEX "SocialProfile_visibility_idx" ON "SocialProfile"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_counterpartId_fkey" FOREIGN KEY ("counterpartId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipMessage" ADD CONSTRAINT "MentorshipMessage_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipMessage" ADD CONSTRAINT "MentorshipMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Mentorships recorded against the old sample members have nobody on the
-- other side; close them so they read as history, not as live relationships.
UPDATE "Mentorship" SET "status" = 'ENDED', "endedAt" = CURRENT_TIMESTAMP
WHERE "counterpartId" IS NULL AND "status" = 'ACTIVE';
