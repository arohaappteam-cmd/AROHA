import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { todayInTimezone } from "@/modules/goals/dates";
import { completeQuestSchema } from "@/modules/quests/schemas";
import { db } from "@/server/db";

import * as goals from "./goal.service";
import { getJourney } from "./journey.service";
import * as quests from "./quest.service";

/**
 * The Journey screen against the real database: complete real quests
 * through the same service the app uses, then check that every part of the
 * progression map reflects exactly those completions — and nothing else.
 */

const HANDLE = `integration-journey-${Date.now()}`;
type TestUser = { id: string; timezone: string; displayName: string };
let user: TestUser;
let goalId: string;

beforeAll(async () => {
  const created = await db.user.create({ data: { handle: HANDLE, displayName: "Journey Tester", timezone: "UTC" } });
  user = { id: created.id, timezone: "UTC", displayName: created.displayName };
  goalId = (
    await goals.createGoal(user.id, {
      title: "Learn Python",
      lifeArea: "LEARNING",
      motivation: null,
      target: null,
      description: null,
      startingPoint: "NEW",
      deadline: null,
      generateRoadmap: true,
    })
  ).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: HANDLE } });
  await db.$disconnect();
});

describe("the journey", () => {
  it("starts honest: nothing done, nothing drawn", async () => {
    const journey = await getJourney(user, { range: "30d" });
    expect(journey.hasHistory).toBe(false);
    expect(journey.questsCompleted).toBe(0);
    expect(journey.character).toMatchObject({ level: 1, tier: "Beginner", totalXp: 0 });
    expect(journey.xp.series[0].total).toBe(0);
    expect(journey.heatmap.stats.ALL.activeDays).toBe(0);
    expect(journey.goals.map((goal) => goal.id)).toEqual([goalId]);
    expect(journey.goals[0].milestones[0].state).toBe("current");
  });

  it("reflects completed quests everywhere, from the result card to the year", async () => {
    const { set } = await quests.ensureTodaySet(user);
    const [first, second] = set.quests.filter((quest) => quest.isCore);
    const result = await quests.completeQuest(user, completeQuestSchema.parse({ questId: first.id }));
    await quests.completeQuest(user, completeQuestSchema.parse({ questId: second.id }));

    // The completion result knows where the day stands.
    expect(result.lifeArea).toBe(first.lifeArea);
    expect(result.day.find((area) => area.lifeArea === first.lifeArea)).toMatchObject({ completed: 1 });
    expect(result.day.reduce((sum, area) => sum + area.offered, 0)).toBe(set.quests.length);

    const journey = await getJourney(user, { range: "7d" });
    const today = todayInTimezone("UTC");
    const ledger = await db.xpTransaction.aggregate({ where: { userId: user.id }, _sum: { amount: true } });

    expect(journey.hasHistory).toBe(true);
    expect(journey.questsCompleted).toBe(2);
    expect(journey.character.totalXp).toBe(ledger._sum.amount);
    expect(journey.xp.thisWeek).toBe(ledger._sum.amount);
    expect(journey.xp.series[0].points.at(-1)).toMatchObject({ from: today, xp: ledger._sum.amount });

    const thisWeek = journey.month.weeks.find((week) => week.state === "current")!;
    expect(thisWeek).toMatchObject({ completed: 2, settled: 2, percent: 100 });

    const day = journey.activity.weeks.at(-1)!.days.find((entry) => entry.date === today)!;
    expect(day).toMatchObject({ completed: 2, offered: set.quests.length, isToday: true });
    expect(day.cells[first.lifeArea as keyof typeof day.cells].state).toBe("done");
    expect(Object.values(day.cells).some((cell) => cell.state === "open")).toBe(true);

    expect(journey.heatmap.stats.ALL).toMatchObject({ activeDays: 1, completed: 2, currentRun: 1 });
    expect(journey.areas.core.find((area) => area.lifeArea === first.lifeArea)).toMatchObject({ completed: 1, percent: 100 });
    expect(journey.week.quests.current).toBe(2);
    expect(journey.monthReview.totals.completed).toBe(2);
    expect(journey.year.months[Number(today.slice(5, 7)) - 1].completed).toBe(2);

    // The first quest unlocks an achievement, and it shows up as this week's.
    expect(journey.achievements.find((achievement) => achievement.slug === "first-quest")).toMatchObject({ unlockedOn: today, progress: null });
    expect(journey.week.achievements.map((achievement) => achievement.slug)).toContain("first-quest");
    expect(journey.achievements.find((achievement) => achievement.slug === "quests-25")!.progress).toEqual({ current: 2, target: 25 });
  });

  it("reads the same after a reload, for every range", async () => {
    const before = await getJourney(user, { range: "all" });
    const again = await getJourney(user, { range: "all" });
    expect(again.questsCompleted).toBe(before.questsCompleted);
    expect(again.xp.series[0].total).toBe(before.xp.series[0].total);
    for (const range of ["7d", "30d", "90d", "6m", "1y", "all"] as const) {
      const journey = await getJourney(user, { range });
      expect(journey.range.key).toBe(range);
      expect(journey.xp.series[0].total, range).toBe(before.character.totalXp);
    }
  });
});
