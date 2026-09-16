import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

/**
 * Data access for achievements: the fact queries the deterministic rules run
 * on, and the unlock writes. Unlocks are idempotent via the unique
 * (userId, achievementId) constraint.
 */
export const achievementRepository = {
  countQuestCompletions(userId: string) {
    return db.questCompletion.count({ where: { userId } });
  },

  async hasEvidenceCompletion(userId: string): Promise<boolean> {
    const found = await db.questCompletion.findFirst({
      where: { userId, evidence: { not: Prisma.DbNull } },
      select: { id: true },
    });
    return found !== null;
  },

  countReadingCompletions(userId: string) {
    return db.questCompletion.count({
      where: { userId, quest: { templateKey: { startsWith: "learning.reading" } } },
    });
  },

  countCompletedGoals(userId: string) {
    return db.goal.count({ where: { userId, status: "COMPLETED" } });
  },

  async longestCompletedChallenge(userId: string): Promise<number> {
    const result = await db.challenge.aggregate({
      where: { userId, status: "COMPLETED" },
      _max: { durationDays: true },
    });
    return result._max.durationDays ?? 0;
  },

  /** Per-skill XP with each skill's own curve, for the skill-based rules. */
  async skillLevelInputs(userId: string): Promise<{ xp: number; baseXp: number; maxLevel: number }[]> {
    const rows = await db.skillXpTransaction.groupBy({
      by: ["skillId"],
      where: { userId },
      _sum: { amount: true },
    });
    if (rows.length === 0) return [];
    const skills = await db.skill.findMany({
      where: { id: { in: rows.map((row) => row.skillId) } },
      select: { id: true, baseXp: true, maxLevel: true },
    });
    const bySkill = new Map(skills.map((skill) => [skill.id, skill]));
    return rows.flatMap((row) => {
      const skill = bySkill.get(row.skillId);
      return skill ? [{ xp: row._sum.amount ?? 0, baseXp: skill.baseXp, maxLevel: skill.maxLevel }] : [];
    });
  },

  listUnlocked(userId: string) {
    return db.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
      select: { unlockedAt: true, achievement: { select: { id: true, slug: true, name: true, description: true, xpReward: true } } },
    });
  },

  findBySlug(slug: string) {
    return db.achievement.findUnique({ where: { slug } });
  },

  /** Records the unlock; false when it was already unlocked (P2002). */
  async unlock(userId: string, achievementId: string): Promise<boolean> {
    try {
      await db.userAchievement.create({ data: { userId, achievementId } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  },
};
