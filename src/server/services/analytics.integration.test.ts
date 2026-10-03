import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// AI behaviour is driven through the mock provider, whatever .env says.
vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>();
  return { ...actual, getEnv: () => ({ ...actual.getEnv(), AI_PROVIDER: "mock" as const }) };
});

import type { LifeArea, QuestDifficulty, QuestStatus } from "@/generated/prisma/enums";
import { parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { shiftDate } from "@/modules/analytics/dataset";
import { getMockAIProvider, resetAIProviderForTests } from "@/server/ai";
import { db } from "@/server/db";

import { getAnalytics, getInsightReport } from "./analytics.service";

/**
 * Phase 10 against the real database: analytics read the user's own quests,
 * goals and ledgers; patterns carry their evidence; the AI can only explain
 * patterns that exist, and never sees the journal.
 */

const HANDLE = `integration-analytics-${Date.now()}`;
const SECRET = "journal-secret-that-must-never-leave";
type TestUser = { id: string; timezone: string };
let user: TestUser;
let stranger: TestUser;

const today = () => todayInTimezone("UTC");
const daysAgo = (n: number) => shiftDate(today(), -n);

async function addQuest(u: TestUser, offset: number, lifeArea: LifeArea, status: QuestStatus, options: { difficulty?: QuestDifficulty; hour?: number; goalId?: string } = {}) {
  const date = parseDateOnly(daysAgo(offset));
  const set = await db.dailyQuestSet.upsert({
    where: { userId_date: { userId: u.id, date } },
    create: { userId: u.id, date, generator: "test" },
    update: {},
  });
  const quest = await db.quest.create({
    data: {
      userId: u.id,
      dailyQuestSetId: set.id,
      lifeArea,
      slot: lifeArea,
      templateKey: `test.${lifeArea.toLowerCase()}`,
      title: `${lifeArea} quest`,
      xpReward: 20,
      source: "SYSTEM",
      status,
      difficulty: options.difficulty ?? "MEDIUM",
      goalId: options.goalId ?? null,
    },
  });
  if (status === "COMPLETED") {
    const completedAt = new Date(date.getTime() + (options.hour ?? 18) * 3_600_000);
    await db.questCompletion.create({ data: { questId: quest.id, userId: u.id, completedAt, xpReward: 20 } });
  }
}

beforeAll(async () => {
  // Premium, so the AI insight report is allowed.
  const created = await db.user.create({ data: { handle: HANDLE, displayName: "Analytics Tester", timezone: "UTC", plan: "PREMIUM" } });
  const other = await db.user.create({ data: { handle: `${HANDLE}-stranger`, displayName: "Stranger", timezone: "UTC" } });
  user = { id: created.id, timezone: "UTC" };
  stranger = { id: other.id, timezone: "UTC" };

  const goal = await db.goal.create({ data: { userId: user.id, title: "Learn Spanish", lifeArea: "LEARNING", createdAt: new Date(parseDateOnly(daysAgo(60)).getTime()) } });
  const milestone = await db.milestone.create({ data: { goalId: goal.id, title: "Basics", order: 0 } });
  await db.mission.createMany({
    data: [
      { goalId: goal.id, milestoneId: milestone.id, title: "Greetings", order: 0, status: "COMPLETED", completedAt: parseDateOnly(daysAgo(3)) },
      { goalId: goal.id, milestoneId: milestone.id, title: "Numbers", order: 1, status: "COMPLETED", completedAt: parseDateOnly(daysAgo(10)) },
      { goalId: goal.id, milestoneId: milestone.id, title: "Food", order: 2 },
    ],
  });

  // Six weeks of learning, done in the morning. Physical: steady, then it drops away.
  for (let offset = 0; offset < 42; offset++) {
    await addQuest(user, offset, "LEARNING", "COMPLETED", { difficulty: "HARD", hour: 8, goalId: offset % 7 === 0 ? goal.id : undefined });
    await addQuest(user, offset, "PHYSICAL", offset >= 21 || offset % 7 === 0 ? "COMPLETED" : "EXPIRED");
  }

  // The stranger's record must never leak into the user's analytics.
  for (let offset = 0; offset < 10; offset++) await addQuest(stranger, offset, "SOCIAL", "COMPLETED");

  await db.journalEntry.create({ data: { userId: user.id, date: parseDateOnly(today()), body: SECRET } });
});

afterEach(() => resetAIProviderForTests());

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

describe("analytics", () => {
  it("builds trends from the user's own records only", async () => {
    const { overview } = await getAnalytics(user, "4w");
    expect(overview.totals.find((total) => total.key === "quests")?.value).toBe(28 + 10);
    expect(overview.totals.find((total) => total.key === "missions")?.value).toBe(2);
    expect(overview.areas.find((area) => area.lifeArea === "PHYSICAL")).toMatchObject({ direction: "down", recent: 3, prior: 21 });
    expect(overview.areas.find((area) => area.lifeArea === "SOCIAL")?.completed).toBe(0);
    expect(overview.goals[0]).toMatchObject({ title: "Learn Spanish", momentum: "moving", isMajor: true, completedMissions: 2, totalMissions: 3 });

    const strangers = await getAnalytics(stranger, "4w");
    expect(strangers.overview.totals.find((total) => total.key === "quests")?.value).toBe(10);
    expect(strangers.overview.goals).toEqual([]);
  });

  it("finds patterns with their evidence and shows them as-is without AI", async () => {
    const analytics = await getAnalytics(user, "12w");
    const keys = analytics.patterns.map((pattern) => pattern.key);
    expect(keys).toContain("area-down:PHYSICAL");
    expect(keys).toContain("hard-time:morning");

    const report = await getInsightReport(analytics);
    expect(report.source).toBe("fallback");
    expect(report.insights.map((insight) => insight.title)).toContain("Your physical activity has decreased recently.");
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("lets the AI explain only real patterns, keeps the backend's evidence, and never sends the journal", async () => {
    const analytics = await getAnalytics(user, "12w");
    let calls = 0;
    let input = "";
    getMockAIProvider().register("analytics.insights", (request) => {
      calls += 1;
      input = JSON.stringify(request.input);
      return {
        headline: "Mornings are working; movement has slipped.",
        insights: [
          { basedOn: ["hard-time:morning", "area-down:PHYSICAL"], title: "Your mornings could carry a short walk too.", detail: "Hard work lands before noon." },
          { basedOn: ["invented-pattern"], title: "You are sleeping badly.", detail: "Made up." },
        ],
        recommendations: [{ basedOn: ["area-down:PHYSICAL"], title: "Walk before your first lesson", detail: "Ten minutes.", href: "https://example.com", actionLabel: "Go" }],
      };
    });

    const report = await getInsightReport(analytics);
    expect(report.source).toBe("ai");
    expect(report.insights).toHaveLength(1);
    expect(report.insights[0].evidence.join(" ")).toContain("physical quests completed in the last 3 weeks");
    expect(report.recommendations[0]).toMatchObject({ title: "Walk before your first lesson", href: null });
    expect(input).not.toContain(SECRET);

    // Same patterns → explained once.
    await getInsightReport(await getAnalytics(user, "4w"));
    expect(calls).toBe(1);
  });
});
