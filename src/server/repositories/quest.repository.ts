import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { DayEnergy } from "@/generated/prisma/enums";
import type { QuestDraft } from "@/modules/quests/context";
import { db } from "@/server/db";

export type PricedDraft = QuestDraft & { xpReward: number; sortOrder: number };

const questInclude = {
  completion: true,
  goal: { select: { id: true, title: true } },
  mission: { select: { id: true, title: true, status: true } },
} as const;

export type QuestWithRelations = Prisma.QuestGetPayload<{ include: typeof questInclude }>;

/** Fields a swap or energy change may replace. */
function questContent(draft: PricedDraft) {
  return {
    lifeArea: draft.lifeArea,
    isCore: draft.isCore,
    templateKey: draft.templateKey,
    title: draft.title,
    description: draft.description,
    steps: draft.steps,
    payload: draft.payload ?? undefined,
    difficulty: draft.difficulty,
    estimatedMinutes: draft.estimatedMinutes,
    xpReward: draft.xpReward,
    rationale: draft.rationale,
    source: "SYSTEM" as const,
    goalId: draft.goalId,
    missionId: draft.missionId,
  };
}

/** A new quest row: identity (owner, slot, order, carry-over) plus content. */
function toQuestData(userId: string, draft: PricedDraft) {
  return {
    userId,
    slot: draft.slot,
    sortOrder: draft.sortOrder,
    carriedFromId: draft.carriedFromId,
    ...questContent(draft),
  };
}

export const questRepository = {
  findSet(userId: string, date: Date) {
    return db.dailyQuestSet.findUnique({
      where: { userId_date: { userId, date } },
      include: { quests: { orderBy: { sortOrder: "asc" }, include: questInclude } },
    });
  },

  /** The most recent day before `date` that has a quest set. */
  findPreviousSet(userId: string, date: Date) {
    return db.dailyQuestSet.findFirst({
      where: { userId, date: { lt: date } },
      orderBy: { date: "desc" },
      include: { quests: { include: { carriedTo: { select: { id: true } }, mission: { select: { status: true } }, goal: { select: { status: true, archivedAt: true } } } } },
    });
  },

  recentQuests(userId: string, from: Date, before: Date) {
    return db.quest.findMany({
      where: { userId, dailyQuestSet: { date: { gte: from, lt: before } } },
      orderBy: { dailyQuestSet: { date: "desc" } },
      select: { templateKey: true, slot: true, status: true },
    });
  },

  /**
   * Creates the day and its quests atomically, expiring unfinished quests
   * from earlier days. Throws a unique-constraint error (P2002) if another
   * request created the same day first.
   */
  createDay(userId: string, date: Date, day: { rationale: string; generator: string; energy: DayEnergy }, drafts: PricedDraft[]) {
    return db.$transaction(async (tx) => {
      await tx.quest.updateMany({
        where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] }, dailyQuestSet: { date: { lt: date } } },
        data: { status: "EXPIRED" },
      });
      await tx.dailyQuestSet.create({
        data: {
          userId,
          date,
          energy: day.energy,
          rationale: day.rationale,
          generator: day.generator,
          quests: { create: drafts.map((draft) => toQuestData(userId, draft)) },
        },
      });
    });
  },

  findQuestOwned(userId: string, questId: string) {
    return db.quest.findFirst({
      where: { id: questId, userId },
      include: { ...questInclude, dailyQuestSet: { select: { id: true, date: true, energy: true } } },
    });
  },

  update(questId: string, data: Prisma.QuestUncheckedUpdateInput) {
    return db.quest.update({ where: { id: questId }, data });
  },

  complete(questId: string, userId: string, xpReward: number, details: { note: string | null; result: string | null; evidence: Prisma.InputJsonValue | undefined }) {
    return db.$transaction(async (tx) => {
      await tx.quest.update({ where: { id: questId }, data: { status: "COMPLETED", skippedAt: null, skipReason: null } });
      return tx.questCompletion.create({ data: { questId, userId, xpReward, ...details } });
    });
  },

  updateCompletion(questId: string, details: { note: string | null; result: string | null; evidence: Prisma.InputJsonValue | typeof Prisma.DbNull }) {
    return db.questCompletion.update({ where: { questId }, data: details });
  },

  undoCompletion(questId: string, status: "PENDING" | "IN_PROGRESS") {
    return db.$transaction([
      db.questCompletion.delete({ where: { questId } }),
      db.quest.update({ where: { id: questId }, data: { status } }),
    ]);
  },

  /** Replaces a quest's content in place (swap or energy change). */
  replaceContent(questId: string, draft: PricedDraft, extra: Prisma.QuestUncheckedUpdateInput = {}) {
    return db.quest.update({
      where: { id: questId },
      data: { ...questContent(draft), status: "PENDING", startedAt: null, ...extra },
    });
  },

  deleteQuest(questId: string) {
    return db.quest.delete({ where: { id: questId } });
  },

  createQuest(userId: string, setId: string, draft: PricedDraft) {
    return db.quest.create({ data: { ...toQuestData(userId, draft), dailyQuestSetId: setId } });
  },

  updateSet(setId: string, data: { energy: DayEnergy; rationale: string }) {
    return db.dailyQuestSet.update({ where: { id: setId }, data });
  },

  /** Core quest outcomes for each day in [from, to]. */
  daySummaries(userId: string, from: Date, to: Date) {
    return db.dailyQuestSet.findMany({
      where: { userId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
      select: { date: true, quests: { where: { isCore: true }, select: { status: true } } },
    });
  },
};
