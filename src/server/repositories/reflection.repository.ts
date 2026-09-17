import "server-only";

import type { DayMood } from "@/generated/prisma/enums";
import { db } from "@/server/db";

type DailyAnswers = {
  mood: DayMood | null;
  learned: string | null;
  wentWell: string | null;
  difficult: string | null;
  proud: string | null;
  differently: string | null;
};

/** Daily reflections: one per user per calendar day. */
export const reflectionRepository = {
  findDaily(userId: string, date: Date) {
    return db.reflection.findUnique({ where: { userId_kind_date: { userId, kind: "DAILY", date } } });
  },

  upsertDaily(userId: string, date: Date, answers: DailyAnswers) {
    return db.reflection.upsert({
      where: { userId_kind_date: { userId, kind: "DAILY", date } },
      update: answers,
      create: { userId, kind: "DAILY", date, ...answers },
    });
  },

  setSummary(reflectionId: string, summary: { aiSummary: string; aiSuggestion: string; summarySource: string }) {
    return db.reflection.update({ where: { id: reflectionId }, data: { ...summary, summarizedAt: new Date() } });
  },

  listRecentDaily(userId: string, limit: number) {
    return db.reflection.findMany({ where: { userId, kind: "DAILY" }, orderBy: { date: "desc" }, take: limit });
  },

  /** The latest daily reflection strictly before `date` — what shapes that day's quests. */
  latestBefore(userId: string, date: Date) {
    return db.reflection.findFirst({ where: { userId, kind: "DAILY", date: { lt: date } }, orderBy: { date: "desc" } });
  },

  countDailyDays(userId: string) {
    return db.reflection.count({ where: { userId, kind: "DAILY" } });
  },
};
