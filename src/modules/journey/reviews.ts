import type { LifeArea } from "@/generated/prisma/enums";
import { shiftDate, type DayWindow } from "@/modules/analytics/dataset";
import { skillGains, type SkillGain } from "@/modules/analytics/overview";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import type { TimelineKind } from "@/modules/timeline/timeline";

import { eachDay, firstOfMonth, formatDay, lastOfMonth, mondayOf } from "./calendar";
import { completionPercent, CORE_AREAS, monthWeeks, tally, xpIn, type JourneyDataset, type WeekRing } from "./progress";

// ─── The week: an end-of-week report ────────────────────────────────────────

export type ReviewAchievement = { slug: string; name: string; emoji: string; rarity: string; date: string };

export type WeeklyReview = {
  window: DayWindow;
  /** The same days of last week — a Tuesday is compared with last Monday–Tuesday. */
  previous: DayWindow;
  /** Days of this week that have happened, today included. */
  daysElapsed: number;
  quests: { current: number; previous: number };
  xp: { current: number; previous: number };
  areas: { lifeArea: LifeArea; label: string; emoji: string; current: number; previous: number; percent: number | null }[];
  activeDays: number;
  bestDay: { date: string; completed: number } | null;
  skills: SkillGain[];
  achievements: ReviewAchievement[];
};

/** Monday to today, against the same days of last week. */
export function weeklyReview(dataset: JourneyDataset, achievements: readonly ReviewAchievement[]): WeeklyReview {
  const window = { from: mondayOf(dataset.today), to: dataset.today };
  const previous = { from: shiftDate(window.from, -7), to: shiftDate(window.to, -7) };
  const days = eachDay(window).map((date) => ({ date, completed: tally(dataset.quests, { from: date, to: date }).completed }));
  const best = days.reduce<{ date: string; completed: number } | null>((top, day) => (day.completed > 0 && (!top || day.completed > top.completed) ? day : top), null);

  return {
    window,
    previous,
    daysElapsed: days.length,
    quests: { current: tally(dataset.quests, window).completed, previous: tally(dataset.quests, previous).completed },
    xp: { current: xpIn(dataset, window), previous: xpIn(dataset, previous) },
    areas: CORE_AREAS.map((lifeArea) => {
      const current = tally(dataset.quests, window, lifeArea);
      return {
        lifeArea,
        label: LIFE_AREAS[lifeArea].label,
        emoji: LIFE_AREAS[lifeArea].emoji,
        current: current.completed,
        previous: tally(dataset.quests, previous, lifeArea).completed,
        percent: completionPercent(current),
      };
    }),
    activeDays: days.filter((day) => day.completed > 0).length,
    bestDay: best,
    skills: skillGains(dataset, window).slice(0, 4),
    achievements: achievements.filter((achievement) => achievement.date >= window.from && achievement.date <= window.to),
  };
}

// ─── The month, week by week ─────────────────────────────────────────────────

export type MonthWeek = WeekRing & {
  areas: { lifeArea: LifeArea; emoji: string; label: string; completed: number; settled: number; percent: number | null }[];
};

export type MonthlyReview = {
  label: string;
  weeks: MonthWeek[];
  /** Month to date, against the same days of last month. */
  totals: { xp: number; completed: number; previousXp: number; previousCompleted: number; previousLabel: string };
};

export function monthlyReview(dataset: JourneyDataset): MonthlyReview {
  const { label, weeks } = monthWeeks(dataset);
  const thisMonth = { from: firstOfMonth(dataset.today), to: dataset.today };
  const lastMonthStart = firstOfMonth(shiftDate(thisMonth.from, -1));
  // Day 1 to the same day-of-month (or the month's end, for a 31st after a 30-day month).
  const sameDay = shiftDate(lastMonthStart, Number(dataset.today.slice(8)) - 1);
  const lastMonth = { from: lastMonthStart, to: sameDay < lastOfMonth(lastMonthStart) ? sameDay : lastOfMonth(lastMonthStart) };

  return {
    label,
    weeks: weeks.map((week) => {
      const counted = { from: week.from, to: week.to < dataset.today ? week.to : dataset.today };
      return {
        ...week,
        areas: CORE_AREAS.map((lifeArea) => {
          const counts = week.state === "upcoming" ? { completed: 0, settled: 0, offered: 0 } : tally(dataset.quests, counted, lifeArea);
          return {
            lifeArea,
            emoji: LIFE_AREAS[lifeArea].emoji,
            label: LIFE_AREAS[lifeArea].label,
            completed: counts.completed,
            settled: counts.settled,
            percent: completionPercent(counts),
          };
        }),
      };
    }),
    totals: {
      xp: xpIn(dataset, thisMonth),
      completed: tally(dataset.quests, thisMonth).completed,
      previousXp: xpIn(dataset, lastMonth),
      previousCompleted: tally(dataset.quests, lastMonth).completed,
      previousLabel: `${formatDay(lastMonth.from, "dayMonth")} – ${formatDay(lastMonth.to, "dayMonth")}`,
    },
  };
}

// ─── The year, month by month ────────────────────────────────────────────────

export type JourneyEvent = { id: string; date: string; kind: TimelineKind; title: string; emoji: string; major: boolean; href?: string };

export type YearMonth = { month: number; label: string; xp: number; completed: number; future: boolean; events: JourneyEvent[] };

export type YearlyJourney = {
  year: number;
  /** Years that have any activity or events, newest first — always includes this year. */
  years: number[];
  months: YearMonth[];
  totals: { xp: number; completed: number; events: number };
};

export function yearsWithActivity(dataset: JourneyDataset, events: readonly JourneyEvent[]): number[] {
  const years = new Set<number>([Number(dataset.today.slice(0, 4))]);
  for (const quest of dataset.quests) if (quest.status === "COMPLETED") years.add(Number(quest.date.slice(0, 4)));
  for (const row of dataset.xp) years.add(Number(row.date.slice(0, 4)));
  for (const event of events) years.add(Number(event.date.slice(0, 4)));
  return [...years].sort((a, b) => b - a);
}

export function resolveYear(value: unknown, years: readonly number[]): number {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return years.includes(parsed) ? parsed : years[0];
}

export function yearlyJourney(dataset: JourneyDataset, events: readonly JourneyEvent[], year: number): YearlyJourney {
  const months = Array.from({ length: 12 }, (_, index): YearMonth => {
    const from = `${year}-${String(index + 1).padStart(2, "0")}-01`;
    const window = { from, to: lastOfMonth(from) };
    const future = from > dataset.today;
    return {
      month: index + 1,
      label: formatDay(from, "month"),
      xp: future ? 0 : xpIn(dataset, window),
      completed: future ? 0 : tally(dataset.quests, window).completed,
      future,
      events: events
        .filter((event) => event.date >= window.from && event.date <= window.to)
        .sort((a, b) => Number(b.major) - Number(a.major) || a.date.localeCompare(b.date)),
    };
  });
  return {
    year,
    years: yearsWithActivity(dataset, events),
    months,
    totals: {
      xp: months.reduce((sum, month) => sum + month.xp, 0),
      completed: months.reduce((sum, month) => sum + month.completed, 0),
      events: months.reduce((sum, month) => sum + month.events.length, 0),
    },
  };
}
