import type { MilestoneStatus, XpSourceType } from "@/generated/prisma/enums";
import { getLevelProgress, levelForXp, TIER_LADDER, tierForLevel, xpRequiredForLevel, type TierTitle } from "@/modules/progression/levels";

import type { JourneyXp } from "./progress";

// ─── Character progression ───────────────────────────────────────────────────

export type TierStep = { title: TierTitle; minLevel: number; reachedOn: string | null; state: "reached" | "current" | "next" | "future" };

export type XpSource = { key: string; label: string; xp: number; share: number };

export type CharacterJourney = {
  level: number;
  tier: TierTitle;
  totalXp: number;
  percent: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  tiers: TierStep[];
  nextTier: { title: TierTitle; minLevel: number; xpNeeded: number } | null;
  /** The most recent level-ups, newest first. */
  recentLevels: { level: number; date: string }[];
  sources: XpSource[];
};

const SOURCE_GROUPS: { key: string; label: string; types: readonly XpSourceType[] }[] = [
  { key: "quests", label: "Quests", types: ["QUEST_COMPLETION"] },
  { key: "goals", label: "Goals & missions", types: ["MISSION_COMPLETION", "MILESTONE_COMPLETION", "GOAL_COMPLETION"] },
  { key: "projects", label: "Projects", types: ["PROJECT_COMPLETION"] },
  { key: "challenges", label: "Challenges", types: ["CHALLENGE_COMPLETION"] },
  { key: "achievements", label: "Achievements", types: ["ACHIEVEMENT"] },
  { key: "assessments", label: "Assessments", types: ["ASSESSMENT_PASSED"] },
  { key: "experiments", label: "Experiments", types: ["EXPERIMENT_COMPLETION"] },
];

/**
 * Replays the XP ledger in order, so every level and tier carries the day it
 * was first reached. Revoked XP can drop a level; the first time it was
 * reached still stands, the way the timeline remembers it.
 */
export function characterJourney(ledger: readonly JourneyXp[]): CharacterJourney {
  let running = 0;
  let level = 1;
  const firstReached = new Map<number, string>();
  if (ledger.length > 0) firstReached.set(1, ledger[0].date);
  for (const row of ledger) {
    running += row.amount;
    const reached = levelForXp(running);
    for (let next = level + 1; next <= reached; next++) if (!firstReached.has(next)) firstReached.set(next, row.date);
    level = reached;
  }

  const totalXp = Math.max(0, running);
  const progress = getLevelProgress(totalXp);
  const tier = tierForLevel(progress.level);
  const currentIndex = TIER_LADDER.findIndex((step) => step.title === tier);
  // Every intermediate level is recorded, so a tier's day is its first level's.
  const tiers = TIER_LADDER.map((step, index): TierStep => ({
    title: step.title,
    minLevel: step.minLevel,
    reachedOn: index <= currentIndex ? (firstReached.get(step.minLevel) ?? null) : null,
    state: index < currentIndex ? "reached" : index === currentIndex ? "current" : index === currentIndex + 1 ? "next" : "future",
  }));
  const upcoming = TIER_LADDER[currentIndex + 1];

  const positive = SOURCE_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    xp: ledger.filter((row) => group.types.includes(row.sourceType)).reduce((sum, row) => sum + row.amount, 0),
  })).filter((source) => source.xp > 0);
  const earned = positive.reduce((sum, source) => sum + source.xp, 0);

  return {
    level: progress.level,
    tier,
    totalXp,
    percent: progress.percent,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
    xpToNextLevel: progress.xpToNextLevel,
    tiers,
    nextTier: upcoming ? { title: upcoming.title, minLevel: upcoming.minLevel, xpNeeded: xpRequiredForLevel(upcoming.minLevel) - totalXp } : null,
    recentLevels: [...firstReached]
      .filter(([reachedLevel]) => reachedLevel > 1 && reachedLevel <= progress.level)
      .sort((a, b) => b[0] - a[0])
      .slice(0, 5)
      .map(([reachedLevel, date]) => ({ level: reachedLevel, date })),
    sources: positive
      .sort((a, b) => b.xp - a.xp)
      .map((source) => ({ ...source, share: earned > 0 ? Math.round((source.xp / earned) * 100) : 0 })),
  };
}

// ─── Goal milestone paths ────────────────────────────────────────────────────

export type MilestoneNodeState = "done" | "current" | "upcoming" | "skipped";
export type MilestoneNode = { id: string; title: string; state: MilestoneNodeState };

/** Done, then the first unfinished milestone as "current", then what's ahead. */
export function milestonePath(milestones: readonly { id: string; title: string; status: MilestoneStatus }[]): MilestoneNode[] {
  let currentFound = false;
  return milestones.map((milestone) => {
    if (milestone.status === "COMPLETED") return { id: milestone.id, title: milestone.title, state: "done" };
    if (milestone.status === "SKIPPED") return { id: milestone.id, title: milestone.title, state: "skipped" };
    const state = currentFound ? "upcoming" : "current";
    currentFound = true;
    return { id: milestone.id, title: milestone.title, state };
  });
}
