import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fallbackInsights } from "@/modules/mentor/fallbacks";
import { db } from "@/server/db";

import * as goals from "./goal.service";
import { buildMentorContext } from "./mentor.service";
import * as quests from "./quest.service";

/**
 * The AI Mentor's context assembly against the real database, plus the
 * deterministic fallback that runs when AI is off (the default in tests).
 */

const HANDLE = `integration-mentor-${Date.now()}`;
type TestUser = { id: string; displayName: string; timezone: string };
let user: TestUser;

beforeAll(async () => {
  const created = await db.user.create({
    data: {
      handle: HANDLE,
      displayName: "Mentor Tester",
      timezone: "UTC",
      preferences: { create: { dailyMinutes: 60, movementOptions: ["WALKING"], learningFormats: ["READING"] } },
      interests: { create: [{ label: "Guitar", slug: "guitar" }] },
    },
  });
  user = { id: created.id, displayName: created.displayName, timezone: created.timezone };

  await goals.createGoal(user.id, {
    title: "Build an app",
    lifeArea: "CAREER",
    motivation: null,
    target: null,
    description: null,
    startingPoint: "NEW",
    deadline: null,
    generateRoadmap: true,
  });

  // A day of activity: complete physical (with reflection), skip social.
  const { set } = await quests.ensureTodaySet(user);
  const physical = set.quests.find((q) => q.slot === "PHYSICAL")!;
  const social = set.quests.find((q) => q.slot === "SOCIAL")!;
  await quests.completeQuest(user, { questId: physical.id, reflection: "Felt great after the walk", result: null, evidenceUrl: null, completeMission: false });
  await quests.skipQuest(user, social.id, "NO_TIME");
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: HANDLE } });
  await db.$disconnect();
});

describe("buildMentorContext", () => {
  it("assembles a grounded, personalised view of the user", async () => {
    const ctx = await buildMentorContext(user);

    expect(ctx.user.name).toBe("Mentor Tester");
    expect(ctx.interests).toContain("Guitar");
    expect(ctx.majorGoal).toMatchObject({ title: "Build an app", milestoneCount: expect.any(Number) });
    expect(ctx.majorGoal!.nextStep).toBeTruthy();

    // Today: physical completed, social skipped → 1 of 5 complete.
    expect(ctx.quests.today).toMatchObject({ completed: 1, total: 5 });
    expect(ctx.quests.last7Days.completed).toBe(1);

    const physical = ctx.quests.byArea.find((a) => a.lifeArea === "PHYSICAL");
    expect(physical).toMatchObject({ completed: 1 });
    expect(ctx.quests.strongAreas).toContain("PHYSICAL");
    expect(ctx.quests.neglectedAreas).toContain("SOCIAL");

    expect(ctx.quests.recentReflections[0]?.note).toBe("Felt great after the walk");
    expect(ctx.quests.commonSkipReasons).toContain("NO_TIME");
  });

  it("feeds a grounded deterministic fallback (AI off by default)", async () => {
    const ctx = await buildMentorContext(user);
    const insights = fallbackInsights(ctx);

    expect(insights.headline).toContain("Build an app");
    expect(insights.analysis.wins.join(" ")).toMatch(/physical/i);
    // Physical is the only completed area, so a quiet area should be flagged.
    expect(insights.analysis.watchOuts.join(" ")).toMatch(/mental|learning|social|personal/i);
    expect(insights.goalGuidance?.goalId).toBe(ctx.majorGoal!.id);
    expect(insights.skillGaps.some((g) => g.label === "Build an app")).toBe(true);
  });
});
