import type {
  ChallengeStatus,
  GoalStatus,
  LifeArea,
  ProjectStatus,
  QuestDifficulty,
  QuestStatus,
  XpSourceType,
} from "@/generated/prisma/enums";
import { formatDateOnly, parseDateOnly } from "@/modules/goals/dates";
import { isValidTimezone } from "@/modules/identity/timezones";

/**
 * Personal analytics (spec §37–39) read only what already happened: quests,
 * ledgers, goals, challenges and projects. Everything here is a count of the
 * user's own records — progress indicators, never measurements of health,
 * ability or worth. The journal is never part of the dataset.
 *
 * Dates are calendar days ("YYYY-MM-DD") in the user's timezone, so string
 * comparison orders them correctly.
 */

export type AnalyticsQuest = {
  /** The day the quest was offered (its quest set's date). */
  date: string;
  lifeArea: LifeArea;
  status: QuestStatus;
  difficulty: QuestDifficulty;
  goalId: string | null;
  /** Local hour (0–23) the quest was completed, when it was. */
  completedHour: number | null;
};

export type AnalyticsXp = { date: string; amount: number; lifeArea: LifeArea | null; sourceType: XpSourceType };

export type AnalyticsSkillXp = { date: string; skillId: string; amount: number; sourceType: XpSourceType };

export type AnalyticsSkill = {
  id: string;
  name: string;
  baseXp: number;
  maxLevel: number;
  treeSlug: string;
  treeName: string;
  treeEmoji: string;
};

export type AnalyticsGoal = {
  id: string;
  title: string;
  lifeArea: LifeArea;
  status: GoalStatus;
  /** Lower = more important; the lowest active goal is the major goal. */
  priority: number;
  createdDate: string;
  percent: number;
  completedMissions: number;
  totalMissions: number;
  /** Days a mission on this goal was completed. */
  missionDates: string[];
  /** Days a quest linked to this goal was completed. */
  questDates: string[];
};

export type AnalyticsChallenge = {
  id: string;
  title: string;
  emoji: string;
  status: ChallengeStatus;
  /** Day the challenge finished, ran out or was set down. */
  endDate: string | null;
  daysCredited: number;
  targetDays: number;
};

export type AnalyticsProject = {
  id: string;
  title: string;
  status: ProjectStatus;
  startDate: string | null;
  treeSlugs: string[];
};

export type AnalyticsDataset = {
  today: string;
  quests: AnalyticsQuest[];
  xp: AnalyticsXp[];
  /** The whole skill ledger — levels at any date are replayed from it. */
  skillXp: AnalyticsSkillXp[];
  skills: AnalyticsSkill[];
  goals: AnalyticsGoal[];
  challenges: AnalyticsChallenge[];
  projects: AnalyticsProject[];
};

// ─── Ranges and windows ─────────────────────────────────────────────────────

export const ANALYTICS_RANGES = {
  "4w": { weeks: 4, label: "4 weeks", previousLabel: "the 4 weeks before" },
  "12w": { weeks: 12, label: "12 weeks", previousLabel: "the 12 weeks before" },
  "26w": { weeks: 26, label: "6 months", previousLabel: "the 6 months before" },
} as const;
export type AnalyticsRangeKey = keyof typeof ANALYTICS_RANGES;
export const DEFAULT_RANGE: AnalyticsRangeKey = "12w";

export function resolveRange(value: unknown): AnalyticsRangeKey {
  return typeof value === "string" && value in ANALYTICS_RANGES ? (value as AnalyticsRangeKey) : DEFAULT_RANGE;
}

/** Patterns always look at the same recent stretch, whatever range is charted. */
export const PATTERN_DAYS = 84;

/** Days of quests and XP a range needs: itself, the period before it, and the pattern window. */
export function fetchDays(range: AnalyticsRangeKey): number {
  return Math.max(ANALYTICS_RANGES[range].weeks * 14, PATTERN_DAYS);
}

const DAY_MS = 86_400_000;

export function shiftDate(date: string, days: number): string {
  return formatDateOnly(new Date(parseDateOnly(date).getTime() + days * DAY_MS));
}

/** An inclusive span of calendar days. */
export type DayWindow = { from: string; to: string };

/** The `days` days ending `endOffset` days before `today` (0 = ending today). */
export function windowEnding(today: string, days: number, endOffset = 0): DayWindow {
  const to = shiftDate(today, -endOffset);
  return { from: shiftDate(to, -(days - 1)), to };
}

export function inWindow(date: string, window: DayWindow): boolean {
  return date >= window.from && date <= window.to;
}

export type WeekBucket = DayWindow & { label: string };

const weekLabel = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });

/** Rolling seven-day weeks ending today, oldest first, labelled by their first day. */
export function weekBuckets(today: string, weeks: number): WeekBucket[] {
  return Array.from({ length: weeks }, (_, index) => {
    const window = windowEnding(today, 7, (weeks - 1 - index) * 7);
    return { ...window, label: weekLabel.format(parseDateOnly(window.from)) };
  });
}

export function displayDay(date: string): string {
  return weekLabel.format(parseDateOnly(date));
}

/** An instant → the calendar day and hour it fell on in `timezone`. */
export function localDayAndHour(instant: Date, timezone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: isValidTimezone(timezone) ? timezone : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

// ─── Quest outcomes ─────────────────────────────────────────────────────────

/** Quests whose day is settled. Deferred quests continue elsewhere; pending ones aren't decided yet. */
export function isSettled(status: QuestStatus): boolean {
  return status === "COMPLETED" || status === "SKIPPED" || status === "EXPIRED";
}

export type QuestFilter = { window: DayWindow; lifeArea?: LifeArea; difficulty?: readonly QuestDifficulty[] };

export function questCounts(quests: readonly AnalyticsQuest[], filter: QuestFilter): { completed: number; settled: number } {
  let completed = 0;
  let settled = 0;
  for (const quest of quests) {
    if (!inWindow(quest.date, filter.window)) continue;
    if (filter.lifeArea && quest.lifeArea !== filter.lifeArea) continue;
    if (filter.difficulty && !filter.difficulty.includes(quest.difficulty)) continue;
    if (quest.status === "COMPLETED") completed += 1;
    if (isSettled(quest.status)) settled += 1;
  }
  return { completed, settled };
}
