import type { QuestStatus } from "@/generated/prisma/enums";
import { daysBetween } from "@/modules/goals/dates";

/**
 * Shadow Debt (spec §29) — AROHA's accountability signal.
 *
 * Debt counts one thing only: core quests that were committed to and then
 * left to expire in silence. Everything the user acknowledged is already
 * resolved — a skip with a reason, a deferral, a swap — because saying
 * "not today, because X" IS the reflection this system exists to encourage.
 *
 * Deliberately non-punitive:
 * - Debt never touches XP, levels, skills or streaks. It is information.
 * - It decays on its own: nothing older than 14 days counts at all, and the
 *   second week counts half. There is no ledger of guilt to pay down.
 * - Days the user never opened AROHA create no quests, and therefore no
 *   debt. Absence is rest, not failure.
 *
 * The output is a level plus concrete, gentle suggestions that map to real
 * app actions (a lighter day, moving a quest, skipping honestly).
 */

/** How far back debt can reach, in days. Older commitments are simply gone. */
export const DEBT_WINDOW_DAYS = 14;
/** Days 8–14 count half: last week matters most, and debt fades on its own. */
const RECENT_DAYS = 7;
const OLDER_WEIGHT = 0.5;

export type ShadowDay = {
  /** Calendar date ("YYYY-MM-DD"); only days before today are considered. */
  date: string;
  /** Statuses of that day's core quests. */
  core: readonly QuestStatus[];
};

export type ShadowDebtLevel = "CLEAR" | "LIGHT" | "BUILDING" | "HEAVY";

export type ShadowDebt = {
  level: ShadowDebtLevel;
  /** Weighted score behind the level — deterministic and explainable. */
  score: number;
  /** Quests that expired unacknowledged in the window. */
  unresolved: number;
  /** …of which in the last 7 days. */
  unresolvedRecent: number;
  /** Days in the window that ended with something left unfinished. */
  heavyDays: number;
  /** Gentle, concrete suggestions matched to the level. */
  guidance: string[];
};

const THRESHOLDS: { level: ShadowDebtLevel; min: number }[] = [
  { level: "HEAVY", min: 5 },
  { level: "BUILDING", min: 2.5 },
  { level: "LIGHT", min: 0.5 },
  { level: "CLEAR", min: 0 },
];

function guidanceFor(level: ShadowDebtLevel, unresolvedRecent: number): string[] {
  switch (level) {
    case "CLEAR":
      return [];
    case "LIGHT":
      return [
        "A couple of quests slipped away quietly. That happens — no points lost.",
        "If a quest doesn't fit a day, skipping it with a reason keeps your plan honest.",
      ];
    case "BUILDING":
      return [
        `${unresolvedRecent} quests expired unfinished this week — the plan may be bigger than the days.`,
        "Try a Low energy day: fewer, lighter quests you'll actually finish.",
        "Anything that keeps not happening can be moved to tomorrow or skipped with a reason — both count as decisions.",
      ];
    case "HEAVY":
      return [
        "For a while now, more has been planned than finished. Nothing is lost — but the plan needs to shrink.",
        "Set today's energy to Low and aim to finish everything on a smaller day.",
        "Consider pausing a goal or setting a challenge down. Fewer commitments, actually kept, beat many left open.",
        "When today ends, note what got in the way — that reflection is how the pattern changes.",
      ];
  }
}

/**
 * Computes Shadow Debt from recent day outcomes. Pure: same days, same debt.
 * Pass only days strictly before `today` — an unfinished day isn't debt yet.
 */
export function computeShadowDebt(days: readonly ShadowDay[], today: string): ShadowDebt {
  let score = 0;
  let unresolved = 0;
  let unresolvedRecent = 0;
  let heavyDays = 0;

  for (const day of days) {
    const age = daysBetween(day.date, today);
    if (age <= 0 || age > DEBT_WINDOW_DAYS) continue;

    const expired = day.core.filter((status) => status === "EXPIRED").length;
    if (expired === 0) continue;

    unresolved += expired;
    if (age <= RECENT_DAYS) unresolvedRecent += expired;
    heavyDays += 1;
    score += expired * (age <= RECENT_DAYS ? 1 : OLDER_WEIGHT);
  }

  const level = THRESHOLDS.find((threshold) => score >= threshold.min)!.level;
  return { level, score, unresolved, unresolvedRecent, heavyDays, guidance: guidanceFor(level, unresolvedRecent) };
}
