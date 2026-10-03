import "server-only";

import type { User } from "@/generated/prisma/client";
import type { DayMood, LifeArea, QuestStatus } from "@/generated/prisma/enums";
import { daysBetween, formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import {
  reflectionSignal,
  REFLECTION_WINDOW_DAYS,
  type DayFacts,
  type ReflectionInput,
  type ReflectionSignal,
} from "@/modules/reflection/reflection";
import { summarizeReflection } from "@/server/ai/reflection-summarizer";
import { db } from "@/server/db";
import { reflectionRepository } from "@/server/repositories/reflection.repository";
import { checkAchievements } from "@/server/services/achievement.service";
import { aiAllowedFor } from "@/server/services/plan.service";

/**
 * End-of-day reflection (spec §42, §45). One reflection per calendar day,
 * connected to that day's quests, summarised (AI or deterministic), and fed
 * back into tomorrow's quest generation.
 */

export class ReflectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReflectionError";
  }
}

type UserLike = Pick<User, "id" | "timezone">;

export type ReflectionDayQuest = {
  id: string;
  title: string;
  lifeArea: LifeArea;
  isCore: boolean;
  status: QuestStatus;
  xpReward: number;
  note: string | null;
};

export type ReflectionView = {
  id: string;
  date: string;
  mood: DayMood | null;
  learned: string | null;
  wentWell: string | null;
  difficult: string | null;
  proud: string | null;
  differently: string | null;
  aiSummary: string | null;
  aiSuggestion: string | null;
  summarySource: string | null;
  updatedAt: Date;
};

export type ReflectionDay = {
  date: string;
  today: string;
  isToday: boolean;
  /** Days outside the window are read-only. */
  editable: boolean;
  quests: ReflectionDayQuest[];
  xpEarned: number;
  reflection: ReflectionView | null;
};

type ReflectionRow = NonNullable<Awaited<ReturnType<typeof reflectionRepository.findDaily>>>;

function toView(row: ReflectionRow): ReflectionView {
  return {
    id: row.id,
    date: formatDateOnly(row.date),
    mood: row.mood,
    learned: row.learned,
    wentWell: row.wentWell,
    difficult: row.difficult,
    proud: row.proud,
    differently: row.differently,
    aiSummary: row.aiSummary,
    aiSuggestion: row.aiSuggestion,
    summarySource: row.summarySource,
    updatedAt: row.updatedAt,
  };
}

async function dayQuests(userId: string, date: Date): Promise<ReflectionDayQuest[]> {
  const set = await db.dailyQuestSet.findUnique({
    where: { userId_date: { userId, date } },
    select: {
      quests: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, lifeArea: true, isCore: true, status: true, xpReward: true, completion: { select: { note: true } } },
      },
    },
  });
  return (set?.quests ?? []).map(({ completion, ...quest }) => ({ ...quest, note: completion?.note ?? null }));
}

function isEditable(date: string, today: string): boolean {
  const age = daysBetween(date, today);
  return age >= 0 && age <= REFLECTION_WINDOW_DAYS;
}

export async function getReflectionDay(user: UserLike, date?: string): Promise<ReflectionDay> {
  const today = todayInTimezone(user.timezone);
  const target = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && daysBetween(date, today) >= 0 ? date : today;
  const day = parseDateOnly(target);

  const [quests, reflection] = await Promise.all([dayQuests(user.id, day), reflectionRepository.findDaily(user.id, day)]);
  return {
    date: target,
    today,
    isToday: target === today,
    editable: isEditable(target, today),
    quests,
    xpEarned: quests.filter((quest) => quest.status === "COMPLETED").reduce((sum, quest) => sum + quest.xpReward, 0),
    reflection: reflection ? toView(reflection) : null,
  };
}

export async function saveReflection(user: UserLike, input: ReflectionInput): Promise<ReflectionView> {
  const today = todayInTimezone(user.timezone);
  if (daysBetween(input.date, today) < 0) throw new ReflectionError("You can't reflect on a day that hasn't happened yet");
  if (!isEditable(input.date, today)) {
    throw new ReflectionError(`Reflections can be written for the last ${REFLECTION_WINDOW_DAYS} days`);
  }

  const date = parseDateOnly(input.date);
  const answers = {
    mood: input.mood,
    learned: input.learned,
    wentWell: input.wentWell,
    difficult: input.difficult,
    proud: input.proud,
    differently: input.differently,
  };
  const saved = await reflectionRepository.upsertDaily(user.id, date, answers);

  const quests = await dayQuests(user.id, date);
  const core = quests.filter((quest) => quest.isCore);
  const facts: DayFacts = {
    date: input.date,
    coreCompleted: core.filter((quest) => quest.status === "COMPLETED").length,
    coreTotal: core.length,
    completedTitles: quests.filter((quest) => quest.status === "COMPLETED").map((quest) => quest.title),
    skippedTitles: quests.filter((quest) => quest.status === "SKIPPED").map((quest) => quest.title),
    questNotes: quests.flatMap((quest) => (quest.note ? [quest.note] : [])),
  };

  // The summary is a nice-to-have: the user's words are already saved.
  let row = saved;
  try {
    const summary = await summarizeReflection(answers, facts, { allowAI: await aiAllowedFor(user.id) });
    row = await reflectionRepository.setSummary(saved.id, {
      aiSummary: summary.summary,
      aiSuggestion: summary.suggestion,
      summarySource: summary.source,
    });
  } catch (error) {
    console.error("Reflection summary failed", saved.id, error);
  }

  try {
    await checkAchievements(user.id);
  } catch (error) {
    console.error("Achievement check failed after reflection", saved.id, error);
  }
  return toView(row);
}

export async function listRecentReflections(user: UserLike, limit = 14): Promise<ReflectionView[]> {
  return (await reflectionRepository.listRecentDaily(user.id, limit)).map(toView);
}

/** The signal tomorrow's quests read: the latest reflection before `date`. */
export async function reflectionSignalFor(userId: string, date: Date): Promise<ReflectionSignal | null> {
  const latest = await reflectionRepository.latestBefore(userId, date);
  // Only yesterday's reflection shapes today — an old rough day shouldn't linger.
  if (!latest || daysBetween(formatDateOnly(latest.date), formatDateOnly(date)) > 1) return null;
  return reflectionSignal({
    date: formatDateOnly(latest.date),
    mood: latest.mood,
    difficult: latest.difficult,
    differently: latest.differently,
  });
}
