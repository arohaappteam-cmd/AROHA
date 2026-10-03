import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { XpSourceType } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { cachedCatalogue } from "@/server/db/catalogue-cache";

/**
 * Data access for the skill system. Reads serve the tree views; writes keep
 * the same rules as the XP ledger: append-only transactions, unique per
 * source, so skill progress is auditable and can be revoked exactly.
 */

const skillOrder = [{ order: "asc" }, { slug: "asc" }] satisfies Prisma.SkillOrderByWithRelationInput[];

export type SkillAward = {
  userId: string;
  skillId: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId: string;
  reason: string;
};

// Catalogue reads: identical for every user, and only a deploy changes them.
const loadTrees = cachedCatalogue(() =>
  db.skillTree.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    include: { skills: { orderBy: skillOrder } },
  }),
);

const loadAllSkills = cachedCatalogue(() =>
  db.skill.findMany({
    orderBy: [{ tree: { sortOrder: "asc" } }, { order: "asc" }, { slug: "asc" }],
    select: { id: true, slug: true, name: true, parentId: true, tree: { select: { slug: true, name: true, emoji: true } } },
  }),
);

export const skillRepository = {
  listTrees() {
    return loadTrees();
  },

  findTree(slug: string) {
    return db.skillTree.findUnique({
      where: { slug },
      include: { skills: { orderBy: skillOrder } },
    });
  },

  /** Total skill XP per skill, from the ledger. Empty map = no progress yet. */
  async xpBySkill(userId: string): Promise<Map<string, number>> {
    const rows = await db.skillXpTransaction.groupBy({
      by: ["skillId"],
      where: { userId },
      _sum: { amount: true },
    });
    return new Map(rows.map((row) => [row.skillId, row._sum.amount ?? 0]));
  },

  /** Skills where ability was demonstrated: a passed practical or project assessment. */
  async abilityVerifiedSkillIds(userId: string): Promise<Set<string>> {
    const rows = await db.assessmentAttempt.findMany({
      where: { userId, outcome: "PASSED", kind: { in: ["PRACTICAL", "PROJECT"] } },
      distinct: ["skillId"],
      select: { skillId: true },
    });
    return new Set(rows.map((row) => row.skillId));
  },

  findSkills(ids: string[]) {
    return db.skill.findMany({
      where: { id: { in: ids } },
      include: { tree: { select: { slug: true, name: true, emoji: true, lifeArea: true } } },
    });
  },

  findSkillBySlug(slug: string) {
    return db.skill.findUnique({
      where: { slug },
      include: { tree: { select: { slug: true, name: true, emoji: true, lifeArea: true } } },
    });
  },

  /** Every skill with its tree, for pickers. */
  listAllSkills() {
    return loadAllSkills();
  },

  /**
   * Awards XP to several specific skills for one source, in one transaction.
   * False without writing when that source already paid anything.
   */
  async awardMany(
    userId: string,
    source: { sourceType: XpSourceType; sourceId: string; reason: string },
    entries: { skillId: string; amount: number }[],
  ): Promise<boolean> {
    if (entries.length === 0) return false;
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.skillXpTransaction.findFirst({
          where: { userId, sourceType: source.sourceType, sourceId: source.sourceId },
          select: { id: true },
        });
        if (existing) return false;
        await tx.skillXpTransaction.createMany({
          data: entries.map((entry) => ({ userId, skillId: entry.skillId, amount: entry.amount, ...source })),
        });
        await tx.userSkill.createMany({
          data: entries.map((entry) => ({ userId, skillId: entry.skillId })),
          skipDuplicates: true,
        });
        return true;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  },

  /** Newest skill progress entries — the skill progression history. */
  listRecentTransactions(userId: string, limit: number, treeId?: string) {
    return db.skillXpTransaction.findMany({
      where: { userId, ...(treeId ? { skill: { treeId } } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        amount: true,
        reason: true,
        sourceType: true,
        createdAt: true,
        skill: { select: { slug: true, name: true, tree: { select: { slug: true, name: true, emoji: true } } } },
      },
    });
  },

  /**
   * Awards skill XP and records the unlock, in one transaction. Returns false
   * without writing when this source already paid — the award target depends
   * on live tree state, so the source-level check (not just the unique
   * constraint) is what stops a repeat from paying a different skill.
   */
  async award(input: SkillAward): Promise<boolean> {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.skillXpTransaction.findFirst({
          where: { userId: input.userId, sourceType: input.sourceType, sourceId: input.sourceId },
          select: { id: true },
        });
        if (existing) return false;

        await tx.skillXpTransaction.create({
          data: {
            userId: input.userId,
            skillId: input.skillId,
            amount: input.amount,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            reason: input.reason,
          },
        });
        await tx.userSkill.upsert({
          where: { userId_skillId: { userId: input.userId, skillId: input.skillId } },
          update: {},
          create: { userId: input.userId, skillId: input.skillId },
        });
        return true;
      });
    } catch (error) {
      // Concurrent double-submit resolved to the same skill.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  },

  /**
   * Removes everything a source awarded (e.g. an undone quest). Skills left
   * with no transactions lose their unlock record too, so state falls back
   * exactly to before the award.
   */
  async revoke(userId: string, sourceType: XpSourceType, sourceId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const removed = await tx.skillXpTransaction.findMany({
        where: { userId, sourceType, sourceId },
        select: { skillId: true },
      });
      if (removed.length === 0) return;

      await tx.skillXpTransaction.deleteMany({ where: { userId, sourceType, sourceId } });

      const skillIds = [...new Set(removed.map((row) => row.skillId))];
      const remaining = await tx.skillXpTransaction.groupBy({
        by: ["skillId"],
        where: { userId, skillId: { in: skillIds } },
      });
      const stillActive = new Set(remaining.map((row) => row.skillId));
      const emptied = skillIds.filter((id) => !stillActive.has(id));
      if (emptied.length > 0) {
        await tx.userSkill.deleteMany({ where: { userId, skillId: { in: emptied } } });
      }
    });
  },
};
