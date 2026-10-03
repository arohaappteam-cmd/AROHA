import { describe, expect, it } from "vitest";

import type { LifeArea, QuestStatus, XpSourceType } from "@/generated/prisma/enums";
import { ACHIEVEMENTS, EMPTY_FACTS, type AchievementFacts } from "@/modules/achievements/catalogue";
import { xpRequiredForLevel } from "@/modules/progression/levels";

import { buckets, lastOfMonth, mondayOf, rangeWindows, resolveJourneyRange } from "./calendar";
import { characterJourney, milestonePath } from "./character";
import { labelIndexes, monotonePath, niceCeiling } from "./chart";
import {
  activityGrid,
  cellState,
  heatLevel,
  heatmap,
  lifeAreaProgress,
  monthWeeks,
  percentChange,
  xpProgress,
  type JourneyDataset,
  type JourneyQuest,
  type JourneyXp,
} from "./progress";
import { monthlyReview, resolveYear, weeklyReview, yearlyJourney } from "./reviews";

// Wednesday 14 October 2026.
const TODAY = "2026-10-14";

let id = 0;
const quest = (date: string, lifeArea: LifeArea, status: QuestStatus = "COMPLETED"): JourneyQuest => ({
  id: `q${++id}`,
  title: `${lifeArea} quest`,
  date,
  lifeArea,
  status,
  xpReward: 20,
  isCore: true,
});
const xp = (date: string, amount: number, lifeArea: LifeArea | null = "PHYSICAL", sourceType: XpSourceType = "QUEST_COMPLETION"): JourneyXp => ({
  date,
  amount,
  lifeArea,
  sourceType,
});
const dataset = (quests: JourneyQuest[] = [], ledger: JourneyXp[] = []): JourneyDataset => ({ today: TODAY, quests, xp: ledger, skillXp: [], skills: [] });

describe("calendar", () => {
  it("finds Mondays and month ends", () => {
    expect(mondayOf("2026-10-14")).toBe("2026-10-12");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
    expect(mondayOf("2026-10-18")).toBe("2026-10-12");
    expect(lastOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(lastOfMonth("2028-02-10")).toBe("2028-02-29");
  });

  it("clips week buckets to the window", () => {
    const weeks = buckets({ from: "2026-10-08", to: "2026-10-20" }, "week");
    expect(weeks.map((week) => [week.from, week.to])).toEqual([
      ["2026-10-08", "2026-10-11"],
      ["2026-10-12", "2026-10-18"],
      ["2026-10-19", "2026-10-20"],
    ]);
  });

  it("starts 'all time' at the first activity, with nothing to compare against", () => {
    expect(rangeWindows("all", TODAY, "2026-09-01")).toMatchObject({ window: { from: "2026-09-01", to: TODAY }, previous: null, days: 44 });
    expect(rangeWindows("7d", TODAY, null)).toMatchObject({ window: { from: "2026-10-08", to: TODAY }, previous: { from: "2026-10-01", to: "2026-10-07" } });
    expect(resolveJourneyRange("nonsense")).toBe("30d");
  });
});

describe("this month's weekly rings", () => {
  it("clips weeks to the month and rates only settled quests", () => {
    const { label, weeks } = monthWeeks(
      dataset([
        quest("2026-10-01", "PHYSICAL"),
        quest("2026-10-02", "MENTAL", "SKIPPED"),
        quest("2026-10-13", "LEARNING"),
        quest("2026-10-14", "SOCIAL", "PENDING"),
        quest("2026-10-14", "PHYSICAL", "DEFERRED"),
      ]),
    );
    expect(label).toBe("October 2026");
    expect(weeks.map((week) => [week.from, week.to, week.state])).toEqual([
      ["2026-10-01", "2026-10-04", "past"],
      ["2026-10-05", "2026-10-11", "past"],
      ["2026-10-12", "2026-10-18", "current"],
      ["2026-10-19", "2026-10-25", "upcoming"],
      ["2026-10-26", "2026-10-31", "upcoming"],
    ]);
    expect(weeks[0]).toMatchObject({ completed: 1, settled: 2, percent: 50 });
    expect(weeks[1].percent).toBeNull();
    // Today's open quest doesn't drag the week down; the deferred one isn't counted here at all.
    expect(weeks[2]).toMatchObject({ completed: 1, settled: 1, percent: 100 });
  });
});

describe("the quest activity matrix", () => {
  it("names what happened in each cell", () => {
    const done = quest(TODAY, "PHYSICAL");
    const open = quest(TODAY, "PHYSICAL", "PENDING");
    const skipped = quest("2026-10-13", "PHYSICAL", "SKIPPED");
    expect(cellState([done], false, false).state).toBe("done");
    expect(cellState([done, open], true, false).state).toBe("partial");
    expect(cellState([open], true, false).state).toBe("open");
    expect(cellState([skipped], false, false).state).toBe("missed");
    expect(cellState([], false, false).state).toBe("rest");
    expect(cellState([], false, true).state).toBe("rest");
  });

  it("lays out Monday-start weeks with this week last, and adds an 'other' row only when needed", () => {
    const grid = activityGrid(dataset([quest("2026-10-13", "PHYSICAL"), quest("2026-10-13", "CREATIVITY")]), 2);
    expect(grid.weeks.map((week) => week.from)).toEqual(["2026-10-05", "2026-10-12"]);
    expect(grid.rows.map((row) => row.key)).toEqual(["PHYSICAL", "MENTAL", "LEARNING", "SOCIAL", "PERSONAL_GOAL", "OTHER"]);
    const tuesday = grid.weeks[1].days[1];
    expect(tuesday).toMatchObject({ date: "2026-10-13", weekday: "Tue", completed: 2, offered: 2 });
    expect(tuesday.cells.OTHER.state).toBe("done");
    expect(grid.weeks[1].days[3]).toMatchObject({ isFuture: true });
    expect(activityGrid(dataset([quest("2026-10-13", "PHYSICAL")]), 1).rows).toHaveLength(5);
  });
});

describe("the consistency heatmap", () => {
  it("steps intensity with the day's completed quests", () => {
    expect([0, 1, 2, 3, 4, 7].map((count) => heatLevel("ALL", count))).toEqual([0, 1, 1, 2, 3, 4]);
    expect([0, 1, 3].map((count) => heatLevel("LEARNING", count))).toEqual([0, 3, 4]);
  });

  it("lets a missed day end a run without erasing the days around it, and never lets today end one", () => {
    const map = heatmap(
      dataset([quest("2026-10-09", "LEARNING"), quest("2026-10-10", "LEARNING"), quest("2026-10-12", "LEARNING"), quest("2026-10-13", "LEARNING")]),
      2,
    );
    expect(map.weeks).toHaveLength(2);
    expect(map.stats.ALL).toMatchObject({ activeDays: 4, longestRun: 2, currentRun: 2, completed: 4 });
    expect(map.stats.PHYSICAL).toMatchObject({ activeDays: 0, longestRun: 0 });
  });
});

describe("XP over time", () => {
  it("totals each filter and compares with the period before", () => {
    const progress = xpProgress(
      dataset([], [xp("2026-10-01", 30), xp("2026-10-10", 50), xp("2026-10-12", 25, "LEARNING"), xp("2026-10-14", 40, null, "ACHIEVEMENT")]),
      rangeWindows("7d", TODAY, "2026-10-01"),
    );
    expect(progress.bucket).toBe("day");
    const all = progress.series.find((series) => series.filter === "ALL")!;
    expect(all.points).toHaveLength(7);
    expect(all.total).toBe(115);
    expect(all.previous).toBe(30);
    expect(progress.series.find((series) => series.filter === "LEARNING")!.total).toBe(25);
    expect(progress.thisWeek).toBe(65);
    expect(progress.best).toMatchObject({ from: "2026-10-10", xp: 50 });
    expect(percentChange(115, 30)).toBe(283);
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe("life areas", () => {
  it("rates each area on settled quests and lists the quiet extra areas", () => {
    const progress = lifeAreaProgress(
      dataset([quest("2026-10-13", "PHYSICAL"), quest("2026-10-12", "PHYSICAL", "SKIPPED"), quest("2026-10-13", "CREATIVITY"), quest("2026-10-01", "MENTAL")]),
      rangeWindows("7d", TODAY, null),
    );
    const physical = progress.core.find((area) => area.lifeArea === "PHYSICAL")!;
    expect(physical).toMatchObject({ completed: 1, settled: 2, percent: 50, share: 50 });
    expect(progress.core.find((area) => area.lifeArea === "MENTAL")).toMatchObject({ percent: null, previousCompleted: 1 });
    expect(progress.extra.map((area) => area.lifeArea)).toEqual(["CREATIVITY"]);
    expect(progress.quiet.map((area) => area.lifeArea)).not.toContain("CREATIVITY");
  });
});

describe("reviews", () => {
  it("reports this week against the same days last week, with this week's unlocks", () => {
    // Last Thursday (the 8th) is past the same point in the week, so it doesn't count against a Wednesday.
    const review = weeklyReview(dataset([quest("2026-10-12", "LEARNING"), quest("2026-10-13", "LEARNING"), quest("2026-10-13", "SOCIAL"), quest("2026-10-06", "LEARNING"), quest("2026-10-08", "LEARNING")], [xp("2026-10-13", 60)]), [
      { slug: "first-quest", name: "First Quest", emoji: "🌅", rarity: "common", date: "2026-10-12" },
      { slug: "old", name: "Old", emoji: "📜", rarity: "common", date: "2026-10-01" },
    ]);
    expect(review).toMatchObject({ daysElapsed: 3, previous: { from: "2026-10-05", to: "2026-10-07" }, quests: { current: 3, previous: 1 }, xp: { current: 60, previous: 0 }, activeDays: 2 });
    expect(review.bestDay).toEqual({ date: "2026-10-13", completed: 2 });
    expect(review.areas.find((area) => area.lifeArea === "LEARNING")).toMatchObject({ current: 2, previous: 1 });
    expect(review.achievements.map((achievement) => achievement.slug)).toEqual(["first-quest"]);
  });

  it("breaks the month into weeks and compares with the same days of last month", () => {
    const review = monthlyReview(
      dataset([quest("2026-10-02", "PHYSICAL"), quest("2026-09-10", "PHYSICAL"), quest("2026-09-20", "PHYSICAL")], [xp("2026-10-02", 20), xp("2026-09-10", 35), xp("2026-09-20", 99)]),
    );
    expect(review.weeks[0].areas.find((area) => area.lifeArea === "PHYSICAL")).toMatchObject({ completed: 1, percent: 100 });
    // Today is the 14th, so September counts up to the 14th only.
    expect(review.totals).toMatchObject({ xp: 20, completed: 1, previousXp: 35, previousCompleted: 1, previousLabel: "Sep 1 – Sep 14" });
  });

  it("charts a year month by month, with the events that happened in it", () => {
    const events = [
      { id: "a", date: "2026-03-04", kind: "achievement" as const, title: "First Project", emoji: "🛠️", major: false },
      { id: "b", date: "2025-06-01", kind: "level" as const, title: "Level 10", emoji: "⭐", major: true },
    ];
    const year = yearlyJourney(dataset([quest("2026-03-05", "LEARNING")], [xp("2026-03-05", 40)]), events, 2026);
    expect(year.years).toEqual([2026, 2025]);
    expect(year.months[2]).toMatchObject({ label: "Mar", xp: 40, completed: 1, future: false });
    expect(year.months[2].events.map((event) => event.id)).toEqual(["a"]);
    expect(year.months[11].future).toBe(true);
    expect(resolveYear("2025", year.years)).toBe(2025);
    expect(resolveYear("1999", year.years)).toBe(2026);
  });
});

describe("character progression", () => {
  it("dates each tier from the ledger and credits the sources of XP", () => {
    const explorer = xpRequiredForLevel(10);
    const journey = characterJourney([
      xp("2026-01-05", 100),
      xp("2026-02-10", explorer - 100 - 50, "LEARNING"),
      xp("2026-03-01", 50, null, "GOAL_COMPLETION"),
    ]);
    expect(journey).toMatchObject({ level: 10, tier: "Explorer", totalXp: explorer });
    expect(journey.tiers.map((tier) => [tier.title, tier.state, tier.reachedOn])).toEqual([
      ["Beginner", "reached", "2026-01-05"],
      ["Explorer", "current", "2026-03-01"],
      ["Practitioner", "next", null],
      ["Advanced", "future", null],
      ["Master", "future", null],
    ]);
    expect(journey.nextTier).toMatchObject({ title: "Practitioner", xpNeeded: xpRequiredForLevel(25) - explorer });
    expect(journey.recentLevels[0]).toEqual({ level: 10, date: "2026-03-01" });
    expect(journey.sources.map((source) => source.key)).toEqual(["quests", "goals"]);
  });

  it("starts everyone as a Beginner with no history", () => {
    const journey = characterJourney([]);
    expect(journey).toMatchObject({ level: 1, tier: "Beginner", totalXp: 0, sources: [], recentLevels: [] });
    expect(journey.tiers[0]).toMatchObject({ state: "current", reachedOn: null });
  });

  it("walks a roadmap: done, then the first unfinished as current", () => {
    expect(
      milestonePath([
        { id: "1", title: "Research", status: "COMPLETED" },
        { id: "2", title: "Design", status: "SKIPPED" },
        { id: "3", title: "Build", status: "IN_PROGRESS" },
        { id: "4", title: "Launch", status: "PENDING" },
      ]).map((node) => node.state),
    ).toEqual(["done", "skipped", "current", "upcoming"]);
  });
});

describe("achievement progress", () => {
  it("reaches its target exactly when the achievement is earned", () => {
    const samples: AchievementFacts[] = [
      EMPTY_FACTS,
      { ...EMPTY_FACTS, questsCompleted: 24, projectsCompleted: 2, reflectionDays: 6, longestChallengeCompleted: 7, maxSkillLevel: 2 },
      { ...EMPTY_FACTS, questsCompleted: 100, projectsCompleted: 3, reflectionDays: 7, longestChallengeCompleted: 30, maxSkillLevel: 3, goalsCompleted: 1, readingQuestsCompleted: 10, experimentsReviewed: 1 },
    ];
    for (const facts of samples) {
      for (const achievement of ACHIEVEMENTS) {
        if (!achievement.progress) continue;
        const { current, target } = achievement.progress(facts);
        expect(current >= target, achievement.slug).toBe(achievement.earned(facts));
      }
    }
  });
});

describe("chart geometry", () => {
  it("rounds axis maxima up to clean numbers", () => {
    expect([0, 7, 12, 180, 240, 999, 1001].map(niceCeiling)).toEqual([1, 10, 20, 200, 250, 1000, 2000]);
  });

  it("spaces labels evenly and keeps both ends", () => {
    expect(labelIndexes(4)).toEqual([0, 1, 2, 3]);
    expect(labelIndexes(30)).toEqual([0, 6, 12, 17, 23, 29]);
  });

  it("never draws the curve past its points", () => {
    // Two zero days around a peak: control points stay within the data's range.
    const path = monotonePath([[0, 100], [50, 100], [100, 0], [150, 100]]);
    const numbers = path.replace(/[MC]/g, ",").split(",").filter(Boolean).map(Number);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(monotonePath([])).toBe("");
    expect(monotonePath([[10, 20]])).toBe("M10,20");
  });
});
