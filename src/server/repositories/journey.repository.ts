import "server-only";

import { db } from "@/server/db";

/**
 * The whole record the Journey screen draws from: every quest ever offered
 * and the full XP ledger. Lean selects — one row per quest or award, no
 * descriptions, no journal.
 */
export const journeyRepository = {
  quests(userId: string) {
    return db.quest.findMany({
      where: { userId, dailyQuestSetId: { not: null } },
      select: {
        id: true,
        title: true,
        lifeArea: true,
        status: true,
        xpReward: true,
        isCore: true,
        dailyQuestSet: { select: { date: true } },
      },
    });
  },

  xp(userId: string) {
    return db.xpTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { amount: true, lifeArea: true, sourceType: true, createdAt: true },
    });
  },
};
