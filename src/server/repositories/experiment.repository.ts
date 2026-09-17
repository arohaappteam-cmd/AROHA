import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { ExperimentDecision, ExperimentImprovement, ExperimentStatus, LifeArea } from "@/generated/prisma/enums";
import { db } from "@/server/db";

const experimentInclude = {
  days: { orderBy: { date: "asc" as const }, select: { date: true, questId: true } },
  goal: { select: { id: true, title: true } },
} satisfies Prisma.ExperimentInclude;

export type ExperimentWithDays = Prisma.ExperimentGetPayload<{ include: typeof experimentInclude }>;

/** Data access for experiments and their earned practice days. */
export const experimentRepository = {
  list(userId: string): Promise<ExperimentWithDays[]> {
    return db.experiment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: experimentInclude });
  },

  listActive(userId: string): Promise<ExperimentWithDays[]> {
    return db.experiment.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, include: experimentInclude });
  },

  findOwned(userId: string, experimentId: string): Promise<ExperimentWithDays | null> {
    return db.experiment.findFirst({ where: { id: experimentId, userId }, include: experimentInclude });
  },

  create(data: {
    userId: string;
    templateKey: string;
    title: string;
    topic: string;
    description: string;
    emoji: string;
    lifeArea: LifeArea;
    skillTree: string | null;
    durationDays: number;
    dailyMinutes: number;
    startDate: Date;
  }) {
    return db.experiment.create({ data });
  },

  setStatus(experimentId: string, status: ExperimentStatus) {
    return db.experiment.update({
      where: { id: experimentId },
      data: { status, endedAt: status === "ACTIVE" ? null : new Date() },
    });
  },

  review(
    experimentId: string,
    data: {
      enjoyment: number;
      interest: number;
      improvement: ExperimentImprovement;
      decision: ExperimentDecision;
      learned: string;
      xpAwarded: number;
      goalId: string | null;
    },
  ) {
    return db.experiment.update({
      where: { id: experimentId },
      data: { ...data, status: "REVIEWED", reviewedAt: new Date(), endedAt: new Date() },
    });
  },

  /** Credits a practice day; false when that date was already credited. */
  async creditDay(experimentId: string, userId: string, date: Date, questId: string): Promise<boolean> {
    try {
      await db.experimentDay.create({ data: { experimentId, userId, date, questId } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  },

  removeCreditsForQuest(userId: string, questId: string) {
    return db.experimentDay.deleteMany({ where: { userId, questId } });
  },

  countReviewed(userId: string) {
    return db.experiment.count({ where: { userId, status: "REVIEWED" } });
  },

  /** Experiment quests in a day's set. */
  experimentQuestsInSet(setId: string) {
    return db.quest.findMany({
      where: { dailyQuestSetId: setId, slot: { startsWith: "EXPERIMENT" } },
      select: { id: true, slot: true, status: true, startedAt: true, payload: true },
    });
  },

  deleteQuest(questId: string) {
    return db.quest.delete({ where: { id: questId } });
  },
};
