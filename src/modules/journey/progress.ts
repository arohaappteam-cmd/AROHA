import type { LifeArea, QuestStatus, XpSourceType } from "@/generated/prisma/enums";
import { inWindow, isSettled, shiftDate, type AnalyticsSkill, type AnalyticsSkillXp, type DayWindow } from "@/modules/analytics/dataset";
import { CORE_DAILY_LIFE_AREAS, LIFE_AREA_LIST, LIFE_AREAS } from "@/modules/identity/life-areas";

import {
  bucketSizeFor,
  buckets,
  eachDay,
  earlier,
  firstOfMonth,
  formatDay,
  lastOfMonth,
  later,
  mondayOf,
  WEEKDAYS,
  type BucketSize,
  type RangeWindows,
} from "./calendar";

/**
 * The Journey screen's numbers, from the user's own records only: every
 * quest they were offered, and the XP ledger. Nothing here is invented to
 * make a chart look fuller — an empty week is shown as an empty week.
 */

export type JourneyQuest = {
  id: string;
  title: string;
  /** The day it was offered (its quest set's date). */
  date: string;
  lifeArea: LifeArea;
  status: QuestStatus;
  xpReward: number;
  isCore: boolean;
};

export type JourneyXp = { date: string; amount: number; lifeArea: LifeArea | null; sourceType: XpSourceType };

export type JourneyDataset = {
  today: string;
  /** Every quest ever offered. */
  quests: JourneyQuest[];
  /** The whole XP ledger, oldest first. */
  xp: JourneyXp[];
  skillXp: AnalyticsSkillXp[];
  skills: AnalyticsSkill[];
};

export const CORE_AREAS: readonly LifeArea[] = CORE_DAILY_LIFE_AREAS;

/** A quest counts on the day it was offered unless it was deferred — then it continues the next day. */
const isOffered = (quest: JourneyQuest) => quest.status !== "DEFERRED";

export function firstActivity(dataset: JourneyDataset): string | null {
  const dates = [dataset.quests.find(isOffered)?.date, dataset.xp[0]?.date].filter((date): date is string => Boolean(date));
  return dates.length ? dates.reduce(earlier) : null;
}

export function hasHistory(dataset: JourneyDataset): boolean {
  return dataset.quests.some((quest) => quest.status === "COMPLETED") || dataset.xp.some((row) => row.amount > 0);
}

/** Quests grouped by the day they were offered. */
export function questsByDay(dataset: JourneyDataset): Map<string, JourneyQuest[]> {
  const days = new Map<string, JourneyQuest[]>();
  for (const quest of dataset.quests) {
    if (!isOffered(quest)) continue;
    const list = days.get(quest.date);
    if (list) list.push(quest);
    else days.set(quest.date, [quest]);
  }
  return days;
}

export type QuestTally = { completed: number; settled: number; offered: number };

export function tally(quests: readonly JourneyQuest[], window: DayWindow, lifeArea?: LifeArea): QuestTally {
  const result = { completed: 0, settled: 0, offered: 0 };
  for (const quest of quests) {
    if (!isOffered(quest) || !inWindow(quest.date, window)) continue;
    if (lifeArea && quest.lifeArea !== lifeArea) continue;
    result.offered += 1;
    if (quest.status === "COMPLETED") result.completed += 1;
    if (isSettled(quest.status)) result.settled += 1;
  }
  return result;
}

/** Completed out of settled — today's still-open quests don't count against anyone. */
export function completionPercent(value: QuestTally): number | null {
  return value.settled > 0 ? Math.round((value.completed / value.settled) * 100) : null;
}

export function xpIn(dataset: JourneyDataset, window: DayWindow, lifeArea?: LifeArea): number {
  let total = 0;
  for (const row of dataset.xp) {
    if (!inWindow(row.date, window)) continue;
    if (lifeArea && row.lifeArea !== lifeArea) continue;
    total += row.amount;
  }
  return total;
}

// ─── This month, week by week ───────────────────────────────────────────────

export type WeekState = "past" | "current" | "upcoming";

export type WeekRing = DayWindow & {
  index: number;
  label: string;
  state: WeekState;
  completed: number;
  settled: number;
  percent: number | null;
  xp: number;
};

/** Monday-start weeks overlapping the current month, clipped to it. */
export function monthWeeks(dataset: JourneyDataset, monthOf = dataset.today): { label: string; weeks: WeekRing[] } {
  const start = firstOfMonth(monthOf);
  const end = lastOfMonth(monthOf);
  const weeks: WeekRing[] = [];
  for (let weekStart = mondayOf(start), index = 1; weekStart <= end; weekStart = shiftDate(weekStart, 7), index++) {
    const from = later(weekStart, start);
    const to = earlier(shiftDate(weekStart, 6), end);
    const state: WeekState = to < dataset.today ? "past" : from > dataset.today ? "upcoming" : "current";
    const counted = { from, to: earlier(to, dataset.today) };
    const counts = state === "upcoming" ? { completed: 0, settled: 0, offered: 0 } : tally(dataset.quests, counted);
    weeks.push({
      index,
      label: `Week ${index}`,
      from,
      to,
      state,
      completed: counts.completed,
      settled: counts.settled,
      percent: completionPercent(counts),
      xp: state === "upcoming" ? 0 : xpIn(dataset, counted),
    });
  }
  return { label: formatDay(start, "monthYear"), weeks };
}

// ─── XP over time ────────────────────────────────────────────────────────────

export type XpFilter = "ALL" | LifeArea;
export const XP_FILTERS: readonly XpFilter[] = ["ALL", ...CORE_AREAS];

export type XpPoint = { key: string; label: string; title: string; from: string; to: string; xp: number };
export type XpSeries = { filter: XpFilter; points: XpPoint[]; total: number; previous: number | null };

export type XpProgress = {
  bucket: BucketSize;
  series: XpSeries[];
  /** Averages and highs for the whole ledger (the "All" series). */
  perDay: number;
  best: XpPoint | null;
  thisWeek: number;
  thisMonth: number;
};

export function xpProgress(dataset: JourneyDataset, range: RangeWindows): XpProgress {
  const size = bucketSizeFor(range.days);
  const slots = buckets(range.window, size);
  const series = XP_FILTERS.map((filter): XpSeries => {
    const area = filter === "ALL" ? undefined : filter;
    const points = slots.map((slot) => ({ key: slot.key, label: slot.label, title: slot.title, from: slot.from, to: slot.to, xp: xpIn(dataset, slot, area) }));
    return {
      filter,
      points,
      total: points.reduce((sum, point) => sum + point.xp, 0),
      previous: range.previous ? xpIn(dataset, range.previous, area) : null,
    };
  });

  const all = series[0];
  const best = all.points.reduce<XpPoint | null>((top, point) => (point.xp > 0 && (!top || point.xp > top.xp) ? point : top), null);
  return {
    bucket: size,
    series,
    perDay: range.days > 0 ? Math.round(all.total / range.days) : 0,
    best,
    thisWeek: xpIn(dataset, { from: mondayOf(dataset.today), to: dataset.today }),
    thisMonth: xpIn(dataset, { from: firstOfMonth(dataset.today), to: dataset.today }),
  };
}

/** Signed percent change, or null when there's no earlier period worth comparing to. */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── The quest activity matrix ───────────────────────────────────────────────

export type ActivityRowKey = LifeArea | "OTHER";
export type ActivityRow = { key: ActivityRowKey; label: string; emoji: string };

/**
 * Every cell says what happened, not just how much: all done, some done,
 * offered but not done, still open today, or nothing offered (a rest).
 */
export type CellState = "done" | "partial" | "missed" | "open" | "rest" | "upcoming";
export type ActivityCell = { state: CellState; completed: number; offered: number };

export type DayQuest = { id: string; title: string; lifeArea: LifeArea; status: QuestStatus; xpReward: number };

export type ActivityDay = {
  date: string;
  weekday: (typeof WEEKDAYS)[number];
  dayOfMonth: number;
  isToday: boolean;
  isFuture: boolean;
  completed: number;
  offered: number;
  cells: Record<ActivityRowKey, ActivityCell>;
  quests: DayQuest[];
};

export type ActivityWeek = DayWindow & { label: string; completed: number; offered: number; days: ActivityDay[] };
export type ActivityGrid = { rows: ActivityRow[]; weeks: ActivityWeek[] };

export function cellState(quests: readonly JourneyQuest[], isToday: boolean, isFuture: boolean): ActivityCell {
  const offered = quests.length;
  const completed = quests.filter((quest) => quest.status === "COMPLETED").length;
  let state: CellState;
  if (isFuture) state = offered > 0 ? "upcoming" : "rest";
  else if (offered === 0) state = "rest";
  else if (completed === offered) state = "done";
  else if (completed > 0) state = "partial";
  else if (isToday && quests.some((quest) => !isSettled(quest.status))) state = "open";
  else state = "missed";
  return { state, completed, offered };
}

const rowOf = (lifeArea: LifeArea): ActivityRowKey => (CORE_AREAS.includes(lifeArea) ? lifeArea : "OTHER");

/** The last `count` Monday-start weeks, this week last. */
export function activityGrid(dataset: JourneyDataset, count = 12, byDay = questsByDay(dataset)): ActivityGrid {
  const thisMonday = mondayOf(dataset.today);
  const weeks: ActivityWeek[] = [];
  let hasOther = false;

  for (let index = count - 1; index >= 0; index--) {
    const from = shiftDate(thisMonday, -7 * index);
    const to = shiftDate(from, 6);
    const days = eachDay({ from, to }).map((date, weekday): ActivityDay => {
      const quests = byDay.get(date) ?? [];
      const isToday = date === dataset.today;
      const isFuture = date > dataset.today;
      if (quests.some((quest) => rowOf(quest.lifeArea) === "OTHER")) hasOther = true;
      const cells = Object.fromEntries(
        [...CORE_AREAS, "OTHER" as const].map((row) => [row, cellState(quests.filter((quest) => rowOf(quest.lifeArea) === row), isToday, isFuture)]),
      ) as Record<ActivityRowKey, ActivityCell>;
      return {
        date,
        weekday: WEEKDAYS[weekday],
        dayOfMonth: Number(date.slice(8)),
        isToday,
        isFuture,
        completed: quests.filter((quest) => quest.status === "COMPLETED").length,
        offered: quests.length,
        cells,
        quests: quests.map(({ id, title, lifeArea, status, xpReward }) => ({ id, title, lifeArea, status, xpReward })),
      };
    });
    weeks.push({
      from,
      to,
      label: `${formatDay(from, "dayMonth")} – ${formatDay(to, "dayMonth")}`,
      completed: days.reduce((sum, day) => sum + day.completed, 0),
      offered: days.reduce((sum, day) => sum + day.offered, 0),
      days,
    });
  }

  const rows: ActivityRow[] = CORE_AREAS.map((key) => ({ key, label: LIFE_AREAS[key].label, emoji: LIFE_AREAS[key].emoji }));
  if (hasOther) rows.push({ key: "OTHER", label: "Other areas", emoji: "✨" });
  return { rows, weeks };
}

// ─── Consistency heatmap ─────────────────────────────────────────────────────

export const HEATMAP_METRICS = ["ALL", ...CORE_AREAS] as const;
export type HeatmapMetric = (typeof HEATMAP_METRICS)[number];

export type HeatmapDay = { date: string; future: boolean; /** Completed quests per metric, in HEATMAP_METRICS order. */ counts: number[] };
export type HeatmapStats = { activeDays: number; longestRun: number; currentRun: number; completed: number };
export type Heatmap = {
  weeks: { from: string; days: HeatmapDay[] }[];
  /** Column index where each month's label goes. */
  months: { column: number; label: string }[];
  stats: Record<HeatmapMetric, HeatmapStats>;
};

/**
 * Intensity 0–4. A full core day is five quests, so "all quests" climbs a
 * step per quest; a single area is mostly one quest a day.
 */
export function heatLevel(metric: HeatmapMetric, count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (metric !== "ALL") return count >= 2 ? 4 : 3;
  if (count >= 5) return 4;
  if (count === 4) return 3;
  if (count === 3) return 2;
  return 1;
}

/**
 * The last `weeks` Monday-start weeks. Runs are reported, but a missed day
 * only ends a run — it never erases the active days around it.
 */
export function heatmap(dataset: JourneyDataset, weeks = 53, byDay = questsByDay(dataset)): Heatmap {
  const start = shiftDate(mondayOf(dataset.today), -7 * (weeks - 1));
  const columns: Heatmap["weeks"] = [];
  const months: Heatmap["months"] = [];
  const stats = Object.fromEntries(HEATMAP_METRICS.map((metric) => [metric, { activeDays: 0, longestRun: 0, currentRun: 0, completed: 0 }])) as Record<
    HeatmapMetric,
    HeatmapStats
  >;
  const runs = HEATMAP_METRICS.map(() => 0);

  for (let column = 0; column < weeks; column++) {
    const from = shiftDate(start, 7 * column);
    if (column === 0 || from.slice(5, 7) !== shiftDate(from, -7).slice(5, 7)) months.push({ column, label: formatDay(from, "month") });
    const days = eachDay({ from, to: shiftDate(from, 6) }).map((date): HeatmapDay => {
      const future = date > dataset.today;
      const completed = (byDay.get(date) ?? []).filter((quest) => quest.status === "COMPLETED");
      const counts = HEATMAP_METRICS.map((metric) => (metric === "ALL" ? completed.length : completed.filter((quest) => quest.lifeArea === metric).length));
      if (!future) {
        HEATMAP_METRICS.forEach((metric, index) => {
          const entry = stats[metric];
          entry.completed += counts[index];
          if (counts[index] > 0) {
            entry.activeDays += 1;
            runs[index] += 1;
            entry.longestRun = Math.max(entry.longestRun, runs[index]);
          } else if (date !== dataset.today) {
            // Today isn't over yet, so it can't end a run.
            runs[index] = 0;
          }
        });
      }
      return { date, future, counts };
    });
    columns.push({ from, days });
  }
  HEATMAP_METRICS.forEach((metric, index) => (stats[metric].currentRun = runs[index]));
  return { weeks: columns, months, stats };
}

// ─── Life areas ──────────────────────────────────────────────────────────────

export type AreaProgress = {
  lifeArea: LifeArea;
  label: string;
  emoji: string;
  core: boolean;
  completed: number;
  settled: number;
  /** Completion rate in the range; null when nothing was settled. */
  percent: number | null;
  /** Share of all quests completed in the range. */
  share: number;
  previousCompleted: number | null;
  previousPercent: number | null;
};

export type LifeAreaProgress = {
  core: AreaProgress[];
  /** Non-core areas that saw quests in the range. */
  extra: AreaProgress[];
  /** Non-core areas with nothing in the range. */
  quiet: { lifeArea: LifeArea; label: string; emoji: string }[];
  completed: number;
};

export function lifeAreaProgress(dataset: JourneyDataset, range: RangeWindows): LifeAreaProgress {
  const total = tally(dataset.quests, range.window).completed;
  const progress = LIFE_AREA_LIST.map((meta): AreaProgress => {
    const current = tally(dataset.quests, range.window, meta.key);
    const previous = range.previous ? tally(dataset.quests, range.previous, meta.key) : null;
    return {
      lifeArea: meta.key,
      label: meta.label,
      emoji: meta.emoji,
      core: meta.core,
      completed: current.completed,
      settled: current.settled,
      percent: completionPercent(current),
      share: total > 0 ? Math.round((current.completed / total) * 100) : 0,
      previousCompleted: previous ? previous.completed : null,
      previousPercent: previous ? completionPercent(previous) : null,
    };
  });
  const extra = progress.filter((area) => !area.core);
  return {
    core: progress.filter((area) => area.core),
    extra: extra.filter((area) => area.settled > 0 || area.completed > 0),
    quiet: extra.filter((area) => area.settled === 0 && area.completed === 0).map(({ lifeArea, label, emoji }) => ({ lifeArea, label, emoji })),
    completed: total,
  };
}
