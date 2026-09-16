import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { LifeArea, XpSourceType } from "@/generated/prisma/enums";
import { attributeAwards, isAwardableXp, type AttributeAward } from "@/modules/progression/awards";
import { getLevelProgress, levelForXp, tierForLevel } from "@/modules/progression/levels";
import type { ProgressionOutcome } from "@/modules/progression/outcome";
import { db } from "@/server/db";

export type { ProgressionOutcome };

/**
 * The AROHA progression engine.
 *
 * Quest completed → backend validates → XP transaction created → total XP
 * updated → level recalculated → stats updated (spec §6).
 *
 * Every rule here is deterministic and backend-owned. Totals are never stored
 * as bare numbers: total XP and every attribute are derived by summing an
 * append-only ledger, so progression is always auditable and reversible.
 */

export type AwardInput = {
  userId: string;
  amount: number;
  sourceType: XpSourceType;
  /** Makes the award idempotent: one transaction per source, ever. */
  sourceId: string;
  /** Null for area-neutral awards (achievements): XP only, no stat gains. */
  lifeArea: LifeArea | null;
  reason: string;
};

function outcomeFor(totalXpBefore: number, awarded: number, attributes: AttributeAward[], didAward: boolean): ProgressionOutcome {
  const totalXp = totalXpBefore + (didAward ? awarded : 0);
  const progress = getLevelProgress(totalXp);
  const previousLevel = levelForXp(totalXpBefore);
  return {
    awarded: didAward,
    xpAwarded: didAward ? awarded : 0,
    totalXp,
    level: progress.level,
    previousLevel,
    leveledUp: didAward && progress.level > previousLevel,
    tier: tierForLevel(progress.level),
    percent: progress.percent,
    xpToNextLevel: progress.xpToNextLevel,
    attributes: didAward ? attributes : [],
  };
}

async function totalXpFor(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const result = await tx.xpTransaction.aggregate({ where: { userId }, _sum: { amount: true } });
  return result._sum.amount ?? 0;
}

/**
 * Awards XP and the attribute gains it implies, in one transaction.
 *
 * Safe to call repeatedly: a second award for the same source hits the
 * ledger's unique constraint and reports `awarded: false` without writing.
 */
export async function awardXp(input: AwardInput): Promise<ProgressionOutcome> {
  // Reject invalid XP outright — never write a negative or absurd amount.
  if (!isAwardableXp(input.amount)) {
    const totalXp = await db.xpTransaction.aggregate({ where: { userId: input.userId }, _sum: { amount: true } });
    return outcomeFor(totalXp._sum.amount ?? 0, 0, [], false);
  }

  const attributes = input.lifeArea ? attributeAwards(input.lifeArea, input.amount) : [];

  try {
    return await db.$transaction(async (tx) => {
      const before = await totalXpFor(tx, input.userId);

      const xpTransaction = await tx.xpTransaction.create({
        data: {
          userId: input.userId,
          amount: input.amount,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          lifeArea: input.lifeArea,
          reason: input.reason,
        },
      });

      if (attributes.length > 0) {
        await tx.statTransaction.createMany({
          data: attributes.map((award) => ({
            userId: input.userId,
            xpTransactionId: xpTransaction.id,
            attribute: award.attribute,
            amount: award.amount,
          })),
        });
      }

      return outcomeFor(before, input.amount, attributes, true);
    });
  } catch (error) {
    // Already awarded for this source (including a concurrent double-submit).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const before = await db.xpTransaction.aggregate({ where: { userId: input.userId }, _sum: { amount: true } });
      return outcomeFor(before._sum.amount ?? 0, input.amount, attributes, false);
    }
    throw error;
  }
}

/**
 * Removes the award for a source (e.g. the user undid a completion). Stat
 * transactions cascade with it, so totals and level fall back exactly.
 */
export async function revokeXp(userId: string, sourceType: XpSourceType, sourceId: string): Promise<ProgressionOutcome> {
  const existing = await db.xpTransaction.findFirst({ where: { userId, sourceType, sourceId } });
  const before = await progressionTotals(userId);

  if (!existing) return outcomeFor(before, 0, [], false);

  await db.xpTransaction.delete({ where: { id: existing.id } });
  const after = before - existing.amount;
  const progress = getLevelProgress(after);

  return {
    awarded: false,
    xpAwarded: -existing.amount,
    totalXp: after,
    level: progress.level,
    previousLevel: levelForXp(before),
    leveledUp: false,
    tier: tierForLevel(progress.level),
    percent: progress.percent,
    xpToNextLevel: progress.xpToNextLevel,
    attributes: [],
  };
}

async function progressionTotals(userId: string): Promise<number> {
  const result = await db.xpTransaction.aggregate({ where: { userId }, _sum: { amount: true } });
  return result._sum.amount ?? 0;
}
