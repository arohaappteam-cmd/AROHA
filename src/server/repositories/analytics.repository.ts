import "server-only";

import { db } from "@/server/db";
import { cachedCatalogue } from "@/server/db/catalogue-cache";

const loadSkills = cachedCatalogue(() =>
  db.skill.findMany({
    select: { id: true, name: true, baseXp: true, maxLevel: true, tree: { select: { slug: true, name: true, emoji: true } } },
  }),
);

/**
 * Read-only aggregates for personal analytics. Journal entries are never
 * read here.
 */
export const analyticsRepository = {
  /** Quests offered on days from `from` (a DATE) onwards. */
  quests(userId: string, from: Date) {
    return db.quest.findMany({
      where: { userId, dailyQuestSet: { date: { gte: from } } },
      select: {
        lifeArea: true,
        status: true,
        difficulty: true,
        goalId: true,
        dailyQuestSet: { select: { date: true } },
        completion: { select: { completedAt: true } },
      },
    });
  },

  xp(userId: string, since: Date) {
    return db.xpTransaction.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { amount: true, lifeArea: true, sourceType: true, createdAt: true },
    });
  },

  skillXp(userId: string) {
    return db.skillXpTransaction.findMany({
      where: { userId },
      select: { skillId: true, amount: true, sourceType: true, createdAt: true },
    });
  },

  /** The skill catalogue (cached per instance in production). */
  skills() {
    return loadSkills();
  },

  /** When each goal moved: completed missions and completed goal-linked quests. */
  goalActivity(userId: string, goalIds: string[]) {
    return Promise.all([
      db.mission.findMany({
        where: { goalId: { in: goalIds }, status: "COMPLETED", completedAt: { not: null } },
        select: { goalId: true, completedAt: true },
      }),
      db.questCompletion.findMany({
        where: { userId, quest: { goalId: { in: goalIds } } },
        select: { completedAt: true, quest: { select: { goalId: true } } },
      }),
    ]);
  },

  challenges(userId: string) {
    return db.challenge.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        emoji: true,
        status: true,
        targetDays: true,
        completedAt: true,
        endedAt: true,
        _count: { select: { days: true } },
      },
    });
  },

  projects(userId: string) {
    return db.project.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        startedAt: true,
        skills: { select: { skill: { select: { tree: { select: { slug: true } } } } } },
      },
    });
  },
};
