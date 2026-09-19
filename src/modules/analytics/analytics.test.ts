import { describe, expect, it } from "vitest";

import type { LifeArea, QuestDifficulty, QuestStatus } from "@/generated/prisma/enums";

import {
  fetchDays,
  localDayAndHour,
  resolveRange,
  shiftDate,
  weekBuckets,
  type AnalyticsDataset,
  type AnalyticsGoal,
  type AnalyticsQuest,
} from "./dataset";
import { fallbackReport, groundReport, type InsightReportDraft } from "./insights";
import { buildOverview, directionOf, goalMomentum } from "./overview";
import { detectPatterns, type Pattern } from "./patterns";

const TODAY = "2026-09-17";
const day = (offset: number) => shiftDate(TODAY, -offset);

function quest(offset: number, lifeArea: LifeArea, status: QuestStatus = "COMPLETED", extra: Partial<AnalyticsQuest> = {}): AnalyticsQuest {
  return {
    date: day(offset),
    lifeArea,
    status,
    difficulty: "MEDIUM" as QuestDifficulty,
    goalId: null,
    completedHour: status === "COMPLETED" ? 19 : null,
    ...extra,
  };
}

/** `count` quests in `area`, one per day starting `from` days ago and going back. */
function daily(area: LifeArea, from: number, count: number, extra: Partial<AnalyticsQuest> = {}): AnalyticsQuest[] {
  return Array.from({ length: count }, (_, index) => quest(from + index, area, "COMPLETED", extra));
}

function dataset(overrides: Partial<AnalyticsDataset> = {}): AnalyticsDataset {
  return { today: TODAY, quests: [], xp: [], skillXp: [], skills: [], goals: [], challenges: [], projects: [], ...overrides };
}

function goal(overrides: Partial<AnalyticsGoal> & { id: string }): AnalyticsGoal {
  return {
    title: `Goal ${overrides.id}`,
    lifeArea: "LEARNING",
    status: "ACTIVE",
    priority: 0,
    createdDate: day(60),
    percent: 20,
    completedMissions: 1,
    totalMissions: 5,
    missionDates: [],
    questDates: [],
    ...overrides,
  };
}

const keys = (patterns: Pattern[]) => patterns.map((pattern) => pattern.key);

describe("windows and ranges", () => {
  it("builds rolling weeks ending today, oldest first", () => {
    const weeks = weekBuckets(TODAY, 12);
    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1)).toMatchObject({ from: "2026-09-11", to: TODAY, label: "Sep 11" });
    expect(weeks[0].from).toBe(day(83));
  });

  it("falls back to the default range and fetches enough for comparisons and patterns", () => {
    expect(resolveRange("26w")).toBe("26w");
    expect(resolveRange("forever")).toBe("12w");
    expect(resolveRange(undefined)).toBe("12w");
    expect(fetchDays("4w")).toBe(84);
    expect(fetchDays("26w")).toBe(364);
  });

  it("reads the calendar day and hour in the user's timezone", () => {
    expect(localDayAndHour(new Date("2026-09-16T20:00:00Z"), "Asia/Kolkata")).toEqual({ date: "2026-09-17", hour: 1 });
    expect(localDayAndHour(new Date("2026-09-16T20:00:00Z"), "Not/AZone")).toEqual({ date: "2026-09-16", hour: 20 });
  });
});

describe("direction", () => {
  it("needs enough activity before calling a change", () => {
    expect(directionOf(0, 0)).toBe("quiet");
    expect(directionOf(0, 2)).toBe("steady"); // too few to say it dipped
    expect(directionOf(3, 8)).toBe("down");
    expect(directionOf(9, 4)).toBe("up");
    expect(directionOf(3, 1)).toBe("steady"); // small numbers wobble
  });
});

describe("overview", () => {
  it("counts only settled quests toward the completion rate and compares with the previous period", () => {
    const overview = buildOverview(
      dataset({
        quests: [
          quest(1, "PHYSICAL"),
          quest(2, "PHYSICAL", "SKIPPED"),
          quest(3, "LEARNING", "EXPIRED"),
          quest(4, "LEARNING", "DEFERRED"),
          quest(0, "SOCIAL", "PENDING"),
          quest(40, "MENTAL"), // previous 4-week period
        ],
        xp: [
          { date: day(1), amount: 30, lifeArea: "PHYSICAL", sourceType: "QUEST_COMPLETION" },
          { date: day(35), amount: 10, lifeArea: "MENTAL", sourceType: "QUEST_COMPLETION" },
        ],
      }),
      "4w",
    );
    expect(overview.completionRate).toBe(33);
    expect(overview.totals.find((total) => total.key === "quests")).toMatchObject({ value: 1, previous: 1 });
    expect(overview.totals.find((total) => total.key === "xp")).toMatchObject({ value: 30, previous: 10 });
    expect(overview.weeks.at(-1)).toMatchObject({ completed: 1, settled: 3, xp: 30 });
  });

  it("names the core areas in the balance and folds the rest into Other", () => {
    const overview = buildOverview(
      dataset({ quests: [quest(1, "PHYSICAL"), quest(2, "PHYSICAL"), quest(3, "CREATIVITY"), quest(4, "LEARNING")] }),
      "4w",
    );
    expect(overview.balance.map((slice) => [slice.key, slice.percent])).toEqual([
      ["PHYSICAL", 50],
      ["MENTAL", 0],
      ["LEARNING", 25],
      ["SOCIAL", 0],
      ["PERSONAL_GOAL", 0],
      ["OTHER", 25],
    ]);
    expect(overview.areas.map((area) => area.lifeArea)).toContain("CREATIVITY");
  });

  it("replays skill levels from the ledger", () => {
    const overview = buildOverview(
      dataset({
        skills: [{ id: "py", name: "Python", baseXp: 50, maxLevel: 5, treeSlug: "programming", treeName: "Programming", treeEmoji: "💻" }],
        skillXp: [
          { date: day(200), skillId: "py", amount: 60, sourceType: "QUEST_COMPLETION" }, // level 1 before the range
          { date: day(3), skillId: "py", amount: 100, sourceType: "QUEST_COMPLETION" }, // 160 → level 2
        ],
      }),
      "4w",
    );
    expect(overview.skills).toEqual([expect.objectContaining({ name: "Python", xp: 100, levelFrom: 1, levelTo: 2 })]);
    expect(overview.totals.find((total) => total.key === "skillLevels")?.value).toBe(1);
  });
});

describe("goal momentum", () => {
  it("calls a goal moving only with progress in two of the last four weeks", () => {
    expect(goalMomentum(goal({ id: "a", missionDates: [day(2), day(10)] }), TODAY, "a")).toMatchObject({ momentum: "moving", activeWeeks: 2, isMajor: true });
    expect(goalMomentum(goal({ id: "b", questDates: [day(2), day(3)] }), TODAY, null).momentum).toBe("slow");
    expect(goalMomentum(goal({ id: "c", missionDates: [day(40)] }), TODAY, null)).toMatchObject({ momentum: "stalled", lastActivity: day(40) });
    expect(goalMomentum(goal({ id: "d", createdDate: day(3) }), TODAY, null).momentum).toBe("new");
    expect(goalMomentum(goal({ id: "e", status: "PAUSED", missionDates: [day(1), day(9)] }), TODAY, null).momentum).toBe("paused");
  });
});

describe("patterns", () => {
  const steadyBase = [...daily("LEARNING", 0, 42), ...daily("MENTAL", 0, 42)];

  it("stays silent without enough history", () => {
    expect(detectPatterns(dataset({ quests: daily("PHYSICAL", 0, 4) }))).toEqual([]);
  });

  it("notices one area dropping while the rest holds steady, with the numbers", () => {
    const quests = [...steadyBase, ...daily("PHYSICAL", 0, 3), ...daily("PHYSICAL", 21, 12)];
    const drop = detectPatterns(dataset({ quests })).find((pattern) => pattern.key === "area-down:PHYSICAL");
    expect(drop).toMatchObject({
      tone: "watch",
      title: "Your physical activity has decreased recently.",
      evidence: "3 physical quests completed in the last 3 weeks, down from 12 the 3 weeks before.",
    });
    expect(drop?.recommendation?.href).toBe("/character/edit#preferences");
  });

  it("reports an overall slowdown instead of blaming every area", () => {
    const quests = [...daily("PHYSICAL", 0, 2), ...daily("LEARNING", 0, 2), ...daily("PHYSICAL", 21, 10), ...daily("LEARNING", 21, 10)];
    const found = keys(detectPatterns(dataset({ quests })));
    expect(found).toContain("overall-down");
    expect(found).not.toContain("area-down:PHYSICAL");
    expect(found).not.toContain("area-down:LEARNING");
  });

  it("finds when difficult tasks get done", () => {
    const hard = (offset: number, hour: number) => quest(offset, "LEARNING", "COMPLETED", { difficulty: "HARD", completedHour: hour });
    const quests = [...steadyBase, hard(1, 8), hard(3, 9), hard(5, 7), hard(8, 11), hard(12, 15), hard(20, 10)];
    const pattern = detectPatterns(dataset({ quests })).find((p) => p.key === "hard-time:morning");
    expect(pattern?.title).toBe("You've been consistently completing difficult tasks in the morning.");
    expect(pattern?.evidence).toBe("5 of 6 hard quests in the last 12 weeks were finished before noon.");
  });

  it("points out goals that aren't moving when there are several", () => {
    const goals = [
      goal({ id: "g1", title: "Learn Python", missionDates: [day(1), day(9), day(16)] }),
      goal({ id: "g2", title: "Run a 10k", priority: 1 }),
      goal({ id: "g3", title: "Read 12 books", priority: 2, questDates: [day(40)] }),
      goal({ id: "g4", title: "Learn guitar", priority: 3 }),
    ];
    const patterns = detectPatterns(dataset({ quests: steadyBase, goals }));
    expect(patterns.find((p) => p.key === "goals-spread")?.title).toBe("You have 4 active goals but are consistently progressing on only one.");
    expect(keys(patterns)).toContain("goal-steady:g1");
    expect(keys(patterns)).not.toContain("goal-stalled:g1");
  });

  it("flags a major goal that has gone quiet", () => {
    const goals = [goal({ id: "g1", title: "Learn Python", missionDates: [day(30)] })];
    const stalled = detectPatterns(dataset({ quests: steadyBase, goals })).find((p) => p.key === "goal-stalled:g1");
    expect(stalled?.evidence).toBe("The last mission or goal quest was completed on Aug 18.");
    expect(stalled?.recommendation?.href).toBe("/goals/g1");
  });

  it("sees skill progress rise after a project started, excluding the project's own payout", () => {
    const skills = [{ id: "py", name: "Python", baseXp: 50, maxLevel: 5, treeSlug: "programming", treeName: "Programming", treeEmoji: "💻" }];
    const skillXp = [
      ...[50, 44, 38].map((offset) => ({ date: day(offset), skillId: "py", amount: 10, sourceType: "QUEST_COMPLETION" as const })),
      ...[25, 22, 19, 16, 13, 10, 7, 4].map((offset) => ({ date: day(offset), skillId: "py", amount: 20, sourceType: "QUEST_COMPLETION" as const })),
      { date: day(2), skillId: "py", amount: 400, sourceType: "PROJECT_COMPLETION" as const },
    ];
    const projects = [{ id: "p1", title: "Budget app", status: "COMPLETED" as const, startDate: day(27), treeSlugs: ["programming"] }];
    const lift = detectPatterns(dataset({ quests: steadyBase, skills, skillXp, projects })).find((p) => p.key === "project-lift:programming");
    expect(lift?.title).toBe("Your programming progress increased after you started building “Budget app”.");
    expect(lift?.evidence).toBe("About 40 Programming skill XP a week from practice since Aug 21, up from about 5 a week in the 6 weeks before.");
  });

  it("orders patterns by how useful they are to hear", () => {
    const quests = [...steadyBase, ...daily("PHYSICAL", 0, 3), ...daily("PHYSICAL", 21, 12)];
    const goals = [goal({ id: "g1" }), goal({ id: "g2", priority: 1 }), goal({ id: "g3", priority: 2 })];
    const patterns = detectPatterns(dataset({ quests, goals }));
    expect(patterns[0].key).toBe("goals-spread");
    expect(patterns.map((p) => p.weight)).toEqual([...patterns.map((p) => p.weight)].sort((a, b) => b - a));
  });
});

describe("insight report", () => {
  const patterns: Pattern[] = [
    {
      key: "area-down:PHYSICAL",
      tone: "watch",
      title: "Your physical activity has decreased recently.",
      evidence: "3 physical quests completed in the last 3 weeks, down from 12 the 3 weeks before.",
      weight: 70,
      recommendation: { title: "Bring movement back in small doses", detail: "…", href: "/character/edit#preferences", actionLabel: "Adjust" },
    },
    { key: "hard-time:morning", tone: "strength", title: "Mornings work.", evidence: "5 of 6 hard quests before noon.", weight: 60, recommendation: null },
  ];

  it("falls back to the patterns as found, with a matching headline", () => {
    const report = fallbackReport(patterns, { hasActiveGoal: true });
    expect(report.headline).toBe("Two things stand out from your last 12 weeks.");
    expect(report.insights[0]).toEqual({ title: patterns[0].title, detail: null, tone: "watch", evidence: [patterns[0].evidence] });
    expect(report.recommendations.map((rec) => rec.title)).toEqual(["Bring movement back in small doses"]);
    expect(fallbackReport([], { hasActiveGoal: false }).recommendations[0].href).toBe("/goals/new");
  });

  it("keeps only AI insights grounded in known patterns and attaches the backend's evidence", () => {
    const draft: InsightReportDraft = {
      headline: "Your mornings are your strength.",
      insights: [
        { basedOn: ["hard-time:morning", "area-down:PHYSICAL"], title: "Move in the morning, when hard things get done.", detail: "…" },
        { basedOn: ["made-up"], title: "You sleep badly.", detail: "Invented." },
      ],
      recommendations: [
        { basedOn: ["area-down:PHYSICAL"], title: "A short morning walk", detail: "…", href: "https://evil.example", actionLabel: "Go" },
        { basedOn: ["hard-time:morning"], title: "Plan tomorrow", detail: "…", href: "/", actionLabel: null },
        { basedOn: ["nope"], title: "Ungrounded", detail: "…", href: null, actionLabel: null },
      ],
    };
    const report = groundReport(draft, patterns, ["/"]);
    expect(report?.insights).toEqual([
      { title: "Move in the morning, when hard things get done.", detail: "…", tone: "watch", evidence: [patterns[1].evidence, patterns[0].evidence] },
    ]);
    expect(report?.recommendations).toEqual([
      { title: "A short morning walk", detail: "…", href: null, actionLabel: null },
      { title: "Plan tomorrow", detail: "…", href: "/", actionLabel: "Open" },
    ]);
  });

  it("returns nothing when no insight is grounded", () => {
    expect(groundReport({ headline: "x", insights: [{ basedOn: ["nope"], title: "x", detail: "x" }], recommendations: [] }, patterns, [])).toBeNull();
  });
});
