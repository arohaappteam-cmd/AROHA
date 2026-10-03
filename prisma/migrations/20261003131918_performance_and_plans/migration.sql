-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'PREMIUM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" "PlanTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "totalXp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlanInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanInterest_tier_createdAt_idx" ON "PlanInterest"("tier", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlanInterest_userId_tier_key" ON "PlanInterest"("userId", "tier");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_projectId_idx" ON "AssessmentAttempt"("projectId");

-- CreateIndex
CREATE INDEX "Evidence_attemptId_idx" ON "Evidence"("attemptId");

-- CreateIndex
CREATE INDEX "Experiment_goalId_idx" ON "Experiment"("goalId");

-- CreateIndex
CREATE INDEX "GroupChallengeEntry_challengeId_idx" ON "GroupChallengeEntry"("challengeId");

-- CreateIndex
CREATE INDEX "MentorshipMessage_authorId_createdAt_idx" ON "MentorshipMessage"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Quest_goalId_idx" ON "Quest"("goalId");

-- CreateIndex
CREATE INDEX "Quest_missionId_idx" ON "Quest"("missionId");

-- CreateIndex
CREATE INDEX "SkillXpTransaction_userId_sourceType_sourceId_idx" ON "SkillXpTransaction"("userId", "sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "PlanInterest" ADD CONSTRAINT "PlanInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Supabase Data API stays closed (see lock_public_api) ──────────────────
ALTER TABLE "PlanInterest" ENABLE ROW LEVEL SECURITY;

-- ─── XP rollup: User.totalXp ───────────────────────────────────────────────
-- Total XP is needed on nearly every page (sidebar, level, leaderboards).
-- Summing the whole ledger each time grows with history; instead the
-- database keeps a running total in the same transaction as every ledger
-- write. Statement-level triggers with transition tables mean a createMany
-- or a cascade costs one UPDATE per affected user, not one per row.
-- The ledger stays the source of truth: the backfill below (or the same
-- UPDATE run by hand) rebuilds the rollup from it at any time.

CREATE OR REPLACE FUNCTION aroha_xp_total_after_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE "User" AS u
  SET "totalXp" = u."totalXp" + d.delta
  FROM (SELECT "userId", SUM("amount")::integer AS delta FROM inserted GROUP BY "userId") AS d
  WHERE u."id" = d."userId";
  RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION aroha_xp_total_after_delete() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE "User" AS u
  SET "totalXp" = u."totalXp" - d.delta
  FROM (SELECT "userId", SUM("amount")::integer AS delta FROM deleted GROUP BY "userId") AS d
  WHERE u."id" = d."userId";
  RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION aroha_xp_total_after_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE "User" AS u
  SET "totalXp" = u."totalXp" + d.delta
  FROM (
    SELECT "userId", SUM(delta)::integer AS delta FROM (
      SELECT "userId", "amount" AS delta FROM updated_new
      UNION ALL
      SELECT "userId", -"amount" AS delta FROM updated_old
    ) AS changes
    GROUP BY "userId"
  ) AS d
  WHERE u."id" = d."userId" AND d.delta <> 0;
  RETURN NULL;
END
$$;

CREATE TRIGGER "XpTransaction_total_insert"
AFTER INSERT ON "XpTransaction"
REFERENCING NEW TABLE AS inserted
FOR EACH STATEMENT EXECUTE FUNCTION aroha_xp_total_after_insert();

CREATE TRIGGER "XpTransaction_total_delete"
AFTER DELETE ON "XpTransaction"
REFERENCING OLD TABLE AS deleted
FOR EACH STATEMENT EXECUTE FUNCTION aroha_xp_total_after_delete();

CREATE TRIGGER "XpTransaction_total_update"
AFTER UPDATE ON "XpTransaction"
REFERENCING OLD TABLE AS updated_old NEW TABLE AS updated_new
FOR EACH STATEMENT EXECUTE FUNCTION aroha_xp_total_after_update();

-- Backfill from the ledger.
UPDATE "User" AS u
SET "totalXp" = s.total
FROM (SELECT "userId", SUM("amount")::integer AS total FROM "XpTransaction" GROUP BY "userId") AS s
WHERE u."id" = s."userId";
