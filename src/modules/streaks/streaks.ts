import type { LifeArea } from "@/generated/prisma/enums";
import { daysBetween } from "@/modules/goals/dates";

/**
 * Streaks (spec §18) — derived, never stored. Each streak is computed from
 * the dates on which qualifying quests were completed, so undoing a quest or
 * missing a day can never delete anything: the lifetime total and the longest
 * run are permanent parts of the record.
 *
 * Streaks are secondary. Progress is primary — which is why every streak
 * carries `lifetimeDays` front and centre, not just the current run.
 */

export type StreakDefinition = {
  key: string;
  label: string;
  emoji: string;
  /** What a day of this streak means, in the user's language. */
  description: string;
  /** A completion counts when its life area or base template key matches. */
  match: { lifeAreas?: readonly LifeArea[]; templateKeys?: readonly string[] };
};

export const STREAK_DEFINITIONS: readonly StreakDefinition[] = [
  {
    key: "showing-up",
    label: "Showing up",
    emoji: "🌱",
    description: "Days with at least one completed quest — any quest.",
    match: {}, // everything counts
  },
  {
    key: "exercise",
    label: "Exercise",
    emoji: "💪",
    description: "Days you moved your body.",
    match: { lifeAreas: ["PHYSICAL"] },
  },
  {
    key: "reading",
    label: "Reading",
    emoji: "📖",
    description: "Days with a real reading session.",
    match: { templateKeys: ["learning.reading"] },
  },
  {
    key: "meditation",
    label: "Meditation",
    emoji: "🧘",
    description: "Days you made space to be still.",
    match: { templateKeys: ["mental.meditation", "mental.breathing", "mental.mindful-walk"] },
  },
];

export type CompletedQuestDay = {
  /** Calendar date of the completion, in the user's timezone ("YYYY-MM-DD"). */
  date: string;
  lifeArea: LifeArea;
  /** Base template key (no variant suffix). */
  templateKey: string;
};

export function completionQualifies(definition: StreakDefinition, completion: Pick<CompletedQuestDay, "lifeArea" | "templateKey">): boolean {
  const { lifeAreas, templateKeys } = definition.match;
  if (!lifeAreas && !templateKeys) return true;
  return Boolean(lifeAreas?.includes(completion.lifeArea)) || Boolean(templateKeys?.includes(completion.templateKey));
}

export type StreakState = {
  key: string;
  label: string;
  emoji: string;
  description: string;
  /** Consecutive days ending today or yesterday (today may still be earned). */
  current: number;
  /** True when today already counts toward the streak. */
  activeToday: boolean;
  /** The longest run ever — kept forever, whatever happens to `current`. */
  longest: number;
  /** Every day this ever happened. The number that only goes up. */
  lifetimeDays: number;
  lastDate: string | null;
};

/**
 * Computes one streak from the set of qualifying dates. A missed day ends the
 * current run (honest, deterministic) but `longest` and `lifetimeDays` are
 * never reduced by anything.
 */
export function computeStreak(definition: StreakDefinition, dates: ReadonlySet<string>, today: string): StreakState {
  const sorted = [...dates].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    run = previous && daysBetween(previous, date) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  const last = sorted.at(-1) ?? null;
  // The run is still alive if it reaches today or yesterday — a day that
  // hasn't been missed yet doesn't break anything.
  const gap = last ? daysBetween(last, today) : Infinity;
  const current = gap <= 1 ? run : 0;

  return {
    key: definition.key,
    label: definition.label,
    emoji: definition.emoji,
    description: definition.description,
    current,
    activeToday: gap === 0,
    longest,
    lifetimeDays: sorted.length,
    lastDate: last,
  };
}

/** All streaks from the full completion history. */
export function computeStreaks(completions: readonly CompletedQuestDay[], today: string): StreakState[] {
  return STREAK_DEFINITIONS.map((definition) => {
    const dates = new Set(completions.filter((c) => completionQualifies(definition, c)).map((c) => c.date));
    return computeStreak(definition, dates, today);
  });
}

/** The streak worth celebrating on the dashboard, if any run is alive. */
export function bestActiveStreak(streaks: readonly StreakState[]): StreakState | null {
  const alive = streaks.filter((streak) => streak.current > 0);
  if (alive.length === 0) return null;
  return alive.reduce((best, streak) => (streak.current > best.current ? streak : best));
}
