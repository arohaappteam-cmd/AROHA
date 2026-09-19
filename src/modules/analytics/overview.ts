import type { LifeArea } from "@/generated/prisma/enums";
import { CORE_DAILY_LIFE_AREAS, LIFE_AREAS } from "@/modules/identity/life-areas";
import { skillLevelForXp } from "@/modules/skills/levels";

import {
  ANALYTICS_RANGES,
  inWindow,
  questCounts,
  weekBuckets,
  windowEnding,
  type AnalyticsDataset,
  type AnalyticsGoal,
  type AnalyticsRangeKey,
  type DayWindow,
} from "./dataset";

// ─── Direction: the last three weeks against the three before ───────────────

export const RECENT_DAYS = 21;

export type Direction = "up" | "down" | "steady" | "quiet";

/**
 * Deliberately conservative: small numbers move around on their own, so a
 * change only counts when there's enough activity for it to mean something.
 */
export function directionOf(recent: number, prior: number): Direction {
  if (recent === 0 && prior === 0) return "quiet";
  if (prior >= 3 && recent <= prior * 0.5) return "down";
  if (recent >= 4 && recent >= prior * 1.5 && recent - prior >= 3) return "up";
  return "steady";
}

export function recentAndPrior(dataset: AnalyticsDataset): { recent: DayWindow; prior: DayWindow } {
  return {
    recent: windowEnding(dataset.today, RECENT_DAYS),
    prior: windowEnding(dataset.today, RECENT_DAYS, RECENT_DAYS),
  };
}

// ─── Goal momentum ───────────────────────────────────────────────────────────

export type Momentum = "moving" | "slow" | "stalled" | "new" | "paused";

export type GoalMomentum = {
  id: string;
  title: string;
  lifeArea: LifeArea;
  percent: number;
  completedMissions: number;
  totalMissions: number;
  /** Of the last four weeks, how many saw progress on this goal. */
  activeWeeks: number;
  lastActivity: string | null;
  momentum: Momentum;
  isMajor: boolean;
};

export function goalActivityDates(goal: AnalyticsGoal): string[] {
  return [...new Set([...goal.missionDates, ...goal.questDates])].sort();
}

/** "Moving" means progress in at least two of the last four weeks — consistent, not a one-off burst. */
export function goalMomentum(goal: AnalyticsGoal, today: string, majorGoalId: string | null): GoalMomentum {
  const dates = goalActivityDates(goal);
  const weeks = weekBuckets(today, 4);
  const activeWeeks = weeks.filter((week) => dates.some((date) => inWindow(date, week))).length;
  const lastActivity = dates.at(-1) ?? null;
  const isNew = goal.createdDate > windowEnding(today, 14).from;

  let momentum: Momentum;
  if (goal.status === "PAUSED") momentum = "paused";
  else if (activeWeeks >= 2) momentum = "moving";
  else if (isNew) momentum = "new";
  else if (activeWeeks === 1) momentum = "slow";
  else momentum = "stalled";

  return {
    id: goal.id,
    title: goal.title,
    lifeArea: goal.lifeArea,
    percent: goal.percent,
    completedMissions: goal.completedMissions,
    totalMissions: goal.totalMissions,
    activeWeeks,
    lastActivity,
    momentum,
    isMajor: goal.id === majorGoalId,
  };
}

export function majorGoalId(goals: readonly AnalyticsGoal[]): string | null {
  const active = goals.filter((goal) => goal.status === "ACTIVE");
  if (active.length === 0) return null;
  return active.reduce((best, goal) => (goal.priority < best.priority ? goal : best)).id;
}

// ─── Skill levels, replayed from the ledger ──────────────────────────────────

export type SkillGain = {
  skillId: string;
  name: string;
  treeName: string;
  treeEmoji: string;
  xp: number;
  levelFrom: number;
  levelTo: number;
  maxLevel: number;
};

/** XP and levels gained per skill inside `window`, most progress first. */
export function skillGains(dataset: AnalyticsDataset, window: DayWindow): SkillGain[] {
  const before = new Map<string, number>();
  const during = new Map<string, number>();
  for (const row of dataset.skillXp) {
    if (row.date < window.from) before.set(row.skillId, (before.get(row.skillId) ?? 0) + row.amount);
    else if (row.date <= window.to) during.set(row.skillId, (during.get(row.skillId) ?? 0) + row.amount);
  }

  const gains: SkillGain[] = [];
  for (const skill of dataset.skills) {
    const xp = during.get(skill.id) ?? 0;
    if (xp <= 0) continue;
    const start = before.get(skill.id) ?? 0;
    gains.push({
      skillId: skill.id,
      name: skill.name,
      treeName: skill.treeName,
      treeEmoji: skill.treeEmoji,
      xp,
      levelFrom: skillLevelForXp(skill.baseXp, skill.maxLevel, start),
      levelTo: skillLevelForXp(skill.baseXp, skill.maxLevel, start + xp),
      maxLevel: skill.maxLevel,
    });
  }
  return gains.sort((a, b) => b.levelTo - b.levelFrom - (a.levelTo - a.levelFrom) || b.xp - a.xp || a.name.localeCompare(b.name));
}

// ─── The overview ────────────────────────────────────────────────────────────

export type StatTotal = { key: "quests" | "xp" | "skillLevels" | "missions"; label: string; value: number; previous: number };

export type WeekPoint = { label: string; from: string; to: string; completed: number; settled: number; xp: number };

export type AreaTrend = {
  lifeArea: LifeArea;
  label: string;
  emoji: string;
  /** Completed quests per week across the range, oldest first. */
  weekly: number[];
  completed: number;
  settled: number;
  direction: Direction;
  recent: number;
  prior: number;
};

export type BalanceSlice = { key: LifeArea | "OTHER"; label: string; completed: number; percent: number };

export type ChallengeSummary = {
  completed: number;
  closedEarly: number;
  active: { id: string; title: string; emoji: string; daysCredited: number; targetDays: number }[];
};

export type AnalyticsOverview = {
  range: { key: AnalyticsRangeKey; label: string; previousLabel: string; from: string; to: string };
  hasActivity: boolean;
  totals: StatTotal[];
  weeks: WeekPoint[];
  completionRate: number | null;
  areas: AreaTrend[];
  balance: BalanceSlice[];
  goals: GoalMomentum[];
  skills: SkillGain[];
  challenges: ChallengeSummary;
};

function sumXp(dataset: AnalyticsDataset, window: DayWindow): number {
  return dataset.xp.reduce((total, row) => (inWindow(row.date, window) ? total + row.amount : total), 0);
}

function missionsIn(dataset: AnalyticsDataset, window: DayWindow): number {
  return dataset.goals.reduce((total, goal) => total + goal.missionDates.filter((date) => inWindow(date, window)).length, 0);
}

function levelsGained(dataset: AnalyticsDataset, window: DayWindow): number {
  return skillGains(dataset, window).reduce((total, gain) => total + gain.levelTo - gain.levelFrom, 0);
}

export function buildOverview(dataset: AnalyticsDataset, rangeKey: AnalyticsRangeKey): AnalyticsOverview {
  const range = ANALYTICS_RANGES[rangeKey];
  const days = range.weeks * 7;
  const current = windowEnding(dataset.today, days);
  const previous = windowEnding(dataset.today, days, days);
  const buckets = weekBuckets(dataset.today, range.weeks);

  const counts = questCounts(dataset.quests, { window: current });
  const totals: StatTotal[] = [
    { key: "quests", label: "Quests completed", value: counts.completed, previous: questCounts(dataset.quests, { window: previous }).completed },
    { key: "xp", label: "XP earned", value: sumXp(dataset, current), previous: sumXp(dataset, previous) },
    { key: "skillLevels", label: "Skill levels gained", value: levelsGained(dataset, current), previous: levelsGained(dataset, previous) },
    { key: "missions", label: "Goal missions done", value: missionsIn(dataset, current), previous: missionsIn(dataset, previous) },
  ];

  const weeks = buckets.map((bucket) => {
    const week = questCounts(dataset.quests, { window: bucket });
    return { label: bucket.label, from: bucket.from, to: bucket.to, completed: week.completed, settled: week.settled, xp: sumXp(dataset, bucket) };
  });

  const { recent, prior } = recentAndPrior(dataset);
  const activeAreas = new Set<LifeArea>(CORE_DAILY_LIFE_AREAS);
  for (const quest of dataset.quests) if (inWindow(quest.date, current) && quest.status === "COMPLETED") activeAreas.add(quest.lifeArea);

  const areas: AreaTrend[] = [...activeAreas].map((lifeArea) => {
    const inRange = questCounts(dataset.quests, { window: current, lifeArea });
    const recentCount = questCounts(dataset.quests, { window: recent, lifeArea }).completed;
    const priorCount = questCounts(dataset.quests, { window: prior, lifeArea }).completed;
    return {
      lifeArea,
      label: LIFE_AREAS[lifeArea].label,
      emoji: LIFE_AREAS[lifeArea].emoji,
      weekly: buckets.map((bucket) => questCounts(dataset.quests, { window: bucket, lifeArea }).completed),
      completed: inRange.completed,
      settled: inRange.settled,
      direction: directionOf(recentCount, priorCount),
      recent: recentCount,
      prior: priorCount,
    };
  });

  // Balance: the five core areas by name, everything else folded into "Other".
  const balance: BalanceSlice[] = CORE_DAILY_LIFE_AREAS.map((lifeArea) => ({
    key: lifeArea,
    label: LIFE_AREAS[lifeArea].label,
    completed: areas.find((area) => area.lifeArea === lifeArea)?.completed ?? 0,
    percent: 0,
  }));
  const other = areas.filter((area) => !CORE_DAILY_LIFE_AREAS.includes(area.lifeArea)).reduce((total, area) => total + area.completed, 0);
  if (other > 0) balance.push({ key: "OTHER", label: "Other areas", completed: other, percent: 0 });
  for (const slice of balance) slice.percent = counts.completed > 0 ? Math.round((slice.completed / counts.completed) * 100) : 0;

  const major = majorGoalId(dataset.goals);
  const momentumOrder: Record<Momentum, number> = { moving: 0, new: 1, slow: 2, stalled: 3, paused: 4 };
  const goals = dataset.goals
    .map((goal) => goalMomentum(goal, dataset.today, major))
    .sort((a, b) => Number(b.isMajor) - Number(a.isMajor) || momentumOrder[a.momentum] - momentumOrder[b.momentum] || b.percent - a.percent);

  const challengeWindowed = dataset.challenges.filter((challenge) => challenge.endDate && inWindow(challenge.endDate, current));
  const challenges: ChallengeSummary = {
    completed: challengeWindowed.filter((challenge) => challenge.status === "COMPLETED").length,
    closedEarly: challengeWindowed.filter((challenge) => challenge.status === "ENDED" || challenge.status === "ABANDONED").length,
    active: dataset.challenges
      .filter((challenge) => challenge.status === "ACTIVE")
      .map(({ id, title, emoji, daysCredited, targetDays }) => ({ id, title, emoji, daysCredited, targetDays })),
  };

  return {
    range: { key: rangeKey, label: range.label, previousLabel: range.previousLabel, from: current.from, to: current.to },
    hasActivity: counts.settled > 0 || totals.some((total) => total.value > 0),
    totals,
    weeks,
    completionRate: counts.settled > 0 ? Math.round((counts.completed / counts.settled) * 100) : null,
    areas,
    balance,
    goals,
    skills: skillGains(dataset, current).slice(0, 5),
    challenges,
  };
}
