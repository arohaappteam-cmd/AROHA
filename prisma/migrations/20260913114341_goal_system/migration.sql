-- CreateEnum
CREATE TYPE "StartingPoint" AS ENUM ('NEW', 'SOME_EXPERIENCE', 'EXPERIENCED');

-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('USER', 'TEMPLATE', 'AI');

-- AlterEnum
BEGIN;
CREATE TYPE "GoalStatus_new" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
ALTER TABLE "public"."Goal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Goal" ALTER COLUMN "status" TYPE "GoalStatus_new" USING ("status"::text::"GoalStatus_new");
ALTER TYPE "GoalStatus" RENAME TO "GoalStatus_old";
ALTER TYPE "GoalStatus_new" RENAME TO "GoalStatus";
DROP TYPE "public"."GoalStatus_old";
ALTER TABLE "Goal" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "Mission" DROP CONSTRAINT "Mission_milestoneId_fkey";

-- DropIndex
DROP INDEX "Milestone_goalId_order_key";

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "startingPoint" "StartingPoint" NOT NULL DEFAULT 'NEW',
ALTER COLUMN "deadline" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'USER',
ALTER COLUMN "milestoneId" SET NOT NULL;

-- CreateTable
CREATE TABLE "RoadmapRevision" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "source" "ContentSource" NOT NULL,
    "generator" TEXT NOT NULL,
    "summary" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadmapRevision_goalId_createdAt_idx" ON "RoadmapRevision"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX "Goal_userId_archivedAt_idx" ON "Goal"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Milestone_goalId_order_idx" ON "Milestone"("goalId", "order");

-- CreateIndex
CREATE INDEX "Mission_milestoneId_order_idx" ON "Mission"("milestoneId", "order");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapRevision" ADD CONSTRAINT "RoadmapRevision_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

