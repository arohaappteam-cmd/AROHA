import type { LifeArea } from "@/generated/prisma/enums";
import { daysBetween, formatDateOnly, parseDateOnly } from "@/modules/goals/dates";
import { MAX_AWARDABLE_XP } from "@/modules/progression/awards";

import type { ChallengeTemplate } from "./catalogue";

/**
 * Deterministic challenge rules, owned by the backend (spec §6, §11).
 * Progress matters more than perfection: every window includes grace days,
 * so a 7-day challenge is earned with 6 days of real action.
 */

/** Days the window forgives: one per week, so no single miss sinks a challenge. */
export function graceDays(durationDays: number): number {
  return Math.floor(durationDays / 7);
}

/** Days of real action needed to complete a challenge of this length. */
export function challengeTargetDays(durationDays: number): number {
  return Math.max(1, durationDays - graceDays(durationDays));
}

/**
 * Completion bonus. Priced from the days of work the challenge asks for —
 * never set by templates or AI, and capped like every award.
 */
export function challengeXpReward(targetDays: number): number {
  return Math.min(MAX_AWARDABLE_XP, targetDays * 15);
}

/** Last calendar day of the window ("YYYY-MM-DD"). */
export function challengeEndDate(startDate: string, durationDays: number): string {
  return formatDateOnly(new Date(parseDateOnly(startDate).getTime() + (durationDays - 1) * 86_400_000));
}

export function isWithinWindow(startDate: string, durationDays: number, date: string): boolean {
  const offset = daysBetween(startDate, date);
  return offset >= 0 && offset < durationDays;
}

/** A quest completion, reduced to what challenge matching needs. */
export type ChallengeQuestFacts = {
  lifeArea: LifeArea;
  /** Base template key (no variant suffix). */
  templateKey: string;
  /** Slug of the skill tree the quest trained, when it trained one. */
  skillTree: string | null;
};

export function questEarnsChallengeDay(match: ChallengeTemplate["match"], quest: ChallengeQuestFacts): boolean {
  return (
    Boolean(match.templateKeys?.includes(quest.templateKey)) ||
    Boolean(match.lifeAreas?.includes(quest.lifeArea)) ||
    Boolean(quest.skillTree && match.skillTrees?.includes(quest.skillTree))
  );
}

export type ChallengeProgress = {
  daysDone: number;
  targetDays: number;
  /** 0–100 toward the target, rounded down. */
  percent: number;
  /** Calendar days of the window still to come, today included. */
  daysLeft: number;
  endDate: string;
  /** Days that can still be earned (today included) cover the remaining target. */
  stillPossible: boolean;
};

export function challengeProgress(
  challenge: { startDate: string; durationDays: number; targetDays: number },
  daysDone: number,
  today: string,
): ChallengeProgress {
  const endDate = challengeEndDate(challenge.startDate, challenge.durationDays);
  const daysLeft = Math.max(0, daysBetween(today, endDate) + 1);
  const remaining = Math.max(0, challenge.targetDays - daysDone);
  return {
    daysDone,
    targetDays: challenge.targetDays,
    percent: Math.min(100, Math.floor((daysDone / challenge.targetDays) * 100)),
    daysLeft,
    endDate,
    stillPossible: remaining <= daysLeft,
  };
}
