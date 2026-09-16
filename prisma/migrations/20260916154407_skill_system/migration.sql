/*
  Warnings:

  - You are about to drop the column `xp` on the `UserSkill` table. All the data in the column will be lost.
  - Added the required column `treeId` to the `Skill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Skill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "baseXp" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "maxLevel" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requiresId" TEXT,
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'TEMPLATE',
ADD COLUMN     "treeId" TEXT NOT NULL,
ADD COLUMN     "unlockLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserSkill" DROP COLUMN "xp";

-- CreateTable
CREATE TABLE "SkillTree" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '✨',
    "lifeArea" "LifeArea" NOT NULL,
    "source" "ContentSource" NOT NULL DEFAULT 'TEMPLATE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillXpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sourceType" "XpSourceType" NOT NULL,
    "sourceId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillXpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillTree_slug_key" ON "SkillTree"("slug");

-- CreateIndex
CREATE INDEX "SkillXpTransaction_userId_createdAt_idx" ON "SkillXpTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SkillXpTransaction_userId_skillId_idx" ON "SkillXpTransaction"("userId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillXpTransaction_skillId_sourceType_sourceId_key" ON "SkillXpTransaction"("skillId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Skill_treeId_order_idx" ON "Skill"("treeId", "order");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "SkillTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_requiresId_fkey" FOREIGN KEY ("requiresId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillXpTransaction" ADD CONSTRAINT "SkillXpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillXpTransaction" ADD CONSTRAINT "SkillXpTransaction_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
