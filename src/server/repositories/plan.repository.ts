import "server-only";

import type { PlanTier } from "@/generated/prisma/enums";
import { db } from "@/server/db";

export const planRepository = {
  async getPlan(userId: string): Promise<PlanTier> {
    const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true } });
    return user?.plan ?? "FREE";
  },

  async listInterests(userId: string): Promise<PlanTier[]> {
    const rows = await db.planInterest.findMany({ where: { userId }, select: { tier: true } });
    return rows.map((row) => row.tier);
  },

  /** Idempotent: asking twice is the same as asking once. */
  registerInterest(userId: string, tier: PlanTier) {
    return db.planInterest.upsert({
      where: { userId_tier: { userId, tier } },
      update: {},
      create: { userId, tier },
    });
  },

  withdrawInterest(userId: string, tier: PlanTier) {
    return db.planInterest.deleteMany({ where: { userId, tier } });
  },

};
