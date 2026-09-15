import "server-only";

import type { LifeArea, QuestStatus } from "@/generated/prisma/enums";
import { db } from "@/server/db";

export type QuestOutcomeRow = { lifeArea: LifeArea; isCore: boolean; status: QuestStatus; date: Date };

/** Aggregate reads for the AI Mentor's context. Read-only. */
export const mentorRepository = {
  /** Core-quest outcomes across [from, to] (calendar dates). */
  questOutcomes(userId: string, from: Date, to: Date): Promise<QuestOutcomeRow[]> {
    return db.quest.findMany({
      where: { userId, dailyQuestSet: { date: { gte: from, lte: to } } },
      select: { lifeArea: true, isCore: true, status: true, dailyQuestSet: { select: { date: true } } },
      orderBy: { dailyQuestSet: { date: "desc" } },
    }).then((rows) =>
      rows.map((r) => ({ lifeArea: r.lifeArea, isCore: r.isCore, status: r.status, date: r.dailyQuestSet!.date })),
    );
  },

  /** Most recent quest reflections (completion notes), newest first. */
  recentReflections(userId: string, limit: number) {
    return db.questCompletion.findMany({
      where: { userId, note: { not: null } },
      orderBy: { completedAt: "desc" },
      take: limit,
      select: { note: true, completedAt: true, quest: { select: { lifeArea: true } } },
    });
  },

  /** Skip reasons in [from, to], for spotting what keeps getting in the way. */
  skipReasons(userId: string, from: Date, to: Date) {
    return db.quest.groupBy({
      by: ["skipReason"],
      where: { userId, status: "SKIPPED", skipReason: { not: null }, dailyQuestSet: { date: { gte: from, lte: to } } },
      _count: { skipReason: true },
    });
  },
};
