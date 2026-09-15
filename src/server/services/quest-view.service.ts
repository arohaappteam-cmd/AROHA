import "server-only";

import type { DayEnergy, LifeArea, MilestoneStatus, QuestDifficulty, QuestStatus } from "@/generated/prisma/enums";
import { formatDateOnly, parseDateOnly } from "@/modules/goals/dates";
import { getLearningExperience, type LearningExperience } from "@/modules/quests/learning";
import { readPayload, type QuestPayload } from "@/modules/quests/payload";
import { allowedActions, dayProgress, type DayProgress, type QuestAction } from "@/modules/quests/status";
import { getCurrentUser } from "@/server/auth/current-user";
import { progression } from "@/server/progression/port";
import { questRepository, type QuestWithRelations } from "@/server/repositories/quest.repository";

import { ensureTodaySet } from "./quest.service";

export type QuestView = {
  id: string;
  slot: string;
  lifeArea: LifeArea;
  isCore: boolean;
  title: string;
  description: string | null;
  steps: string[];
  payload: QuestPayload | null;
  difficulty: QuestDifficulty;
  estimatedMinutes: number | null;
  xpReward: number;
  status: QuestStatus;
  rationale: string | null;
  startedAt: Date | null;
  skipReason: string | null;
  carriedOver: boolean;
  swapCount: number;
  actions: QuestAction[];
  completion: { completedAt: Date; note: string | null; result: string | null; evidenceUrl: string | null } | null;
  goal: { id: string; title: string } | null;
  mission: { id: string; title: string; status: MilestoneStatus } | null;
};

export type DaySummary = { date: string; completed: number; total: number; isToday: boolean };

export type TodayJourney = {
  date: string;
  energy: DayEnergy;
  rationale: string | null;
  core: QuestView[];
  bonus: QuestView[];
  progress: DayProgress;
  /** False until the progression engine awards XP. */
  xpAwarded: boolean;
  week: DaySummary[];
};

function evidenceUrl(evidence: unknown): string | null {
  if (evidence && typeof evidence === "object" && "url" in evidence && typeof evidence.url === "string") return evidence.url;
  return null;
}

function toView(quest: QuestWithRelations, isToday: boolean): QuestView {
  return {
    id: quest.id,
    slot: quest.slot,
    lifeArea: quest.lifeArea,
    isCore: quest.isCore,
    title: quest.title,
    description: quest.description,
    steps: quest.steps,
    payload: readPayload(quest.payload),
    difficulty: quest.difficulty,
    estimatedMinutes: quest.estimatedMinutes,
    xpReward: quest.xpReward,
    status: quest.status,
    rationale: quest.rationale,
    startedAt: quest.startedAt,
    skipReason: quest.skipReason,
    carriedOver: quest.carriedFromId !== null,
    swapCount: quest.swapCount,
    actions: allowedActions(quest, isToday),
    completion: quest.completion
      ? {
          completedAt: quest.completion.completedAt,
          note: quest.completion.note,
          result: quest.completion.result,
          evidenceUrl: evidenceUrl(quest.completion.evidence),
        }
      : null,
    goal: quest.goal,
    mission: quest.mission,
  };
}

const DAY_MS = 86_400_000;

export async function getTodayJourney(): Promise<TodayJourney> {
  const user = await getCurrentUser();
  const { set, today } = await ensureTodaySet(user);

  const todayDate = parseDateOnly(today);
  const weekStart = new Date(todayDate.getTime() - 6 * DAY_MS);
  const summaries = await questRepository.daySummaries(user.id, weekStart, todayDate);
  const byDate = new Map(summaries.map((s) => [formatDateOnly(s.date), s]));

  const quests = set.quests.map((quest) => toView(quest, true));

  return {
    date: today,
    energy: set.energy,
    rationale: set.rationale,
    core: quests.filter((q) => q.isCore),
    bonus: quests.filter((q) => !q.isCore),
    progress: dayProgress(quests),
    xpAwarded: progression().awardsXp,
    week: Array.from({ length: 7 }, (_, i) => {
      const date = formatDateOnly(new Date(weekStart.getTime() + i * DAY_MS));
      const summary = byDate.get(date);
      return {
        date,
        completed: summary?.quests.filter((q) => q.status === "COMPLETED").length ?? 0,
        total: summary?.quests.length ?? 0,
        isToday: date === today,
      };
    }),
  };
}

export type QuestDetail = QuestView & {
  date: string;
  isToday: boolean;
  lesson: LearningExperience | null;
  xpAwarded: boolean;
};

export async function getQuestDetail(questId: string): Promise<QuestDetail | null> {
  const user = await getCurrentUser();
  // Make sure today's set exists so "is today" is meaningful on a fresh day.
  const { today } = await ensureTodaySet(user);
  const quest = await questRepository.findQuestOwned(user.id, questId);
  if (!quest || !quest.dailyQuestSet) return null;

  const date = formatDateOnly(quest.dailyQuestSet.date);
  const isToday = date === today;
  const view = toView(quest, isToday);
  const lesson = view.payload?.kind === "lesson" ? getLearningExperience(view.payload.provider, view.payload.lessonId) : null;

  return { ...view, date, isToday, lesson, xpAwarded: progression().awardsXp };
}
