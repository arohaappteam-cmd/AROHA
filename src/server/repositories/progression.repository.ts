import "server-only";

import type { LifeArea } from "@/generated/prisma/enums";
import type { AttributeTotal } from "@/modules/analytics/attribute-totals";
import { db } from "@/server/db";

/**
 * Read access to the progression ledger. Writes (awarding XP) belong to the
 * progression engine service introduced alongside quest completion.
 */
export const progressionRepository = {
  async getTotalXp(userId: string): Promise<number> {
    const result = await db.xpTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  },

  async getAttributeTotals(userId: string): Promise<AttributeTotal[]> {
    const rows = await db.statTransaction.groupBy({
      by: ["attribute"],
      where: { userId },
      _sum: { amount: true },
    });
    return rows.map((row) => ({
      attribute: row.attribute,
      total: row._sum.amount ?? 0,
    }));
  },

  async getXpByLifeArea(userId: string): Promise<Map<LifeArea, number>> {
    const rows = await db.xpTransaction.groupBy({
      by: ["lifeArea"],
      where: { userId, lifeArea: { not: null } },
      _sum: { amount: true },
    });
    return new Map(
      rows
        .filter((row) => row.lifeArea !== null)
        .map((row) => [row.lifeArea!, row._sum.amount ?? 0]),
    );
  },

  /** Newest XP transactions with the attribute gains they produced. */
  listRecentTransactions(userId: string, limit: number) {
    return db.xpTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        amount: true,
        reason: true,
        lifeArea: true,
        sourceType: true,
        createdAt: true,
        statTransactions: { select: { attribute: true, amount: true } },
      },
    });
  },

  countAchievements(userId: string) {
    return db.userAchievement.count({ where: { userId } });
  },

  countSkills(userId: string) {
    return db.userSkill.count({ where: { userId } });
  },

  countCompletedQuests(userId: string) {
    return db.questCompletion.count({ where: { userId } });
  },
};
