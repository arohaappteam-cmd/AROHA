import { describe, expect, it } from "vitest";

import { fallbackInsights } from "./fallbacks";
import { discoverySchema, insightsSchema, questContentSetSchema } from "./schemas";
import type { MentorContext } from "./types";

const baseContext: MentorContext = {
  user: { name: "Maya", timezone: "UTC" },
  preferences: { dailyMinutes: 60, challengeLevel: "BALANCED", movementOptions: ["WALKING"], learningFormats: ["READING"] },
  interests: ["Guitar", "Investing"],
  focusAreas: ["CAREER"],
  progression: { level: 3, tier: "Beginner", totalXp: 320, attributes: [] },
  majorGoal: { id: "goal-1", title: "Build an app", lifeArea: "CAREER", status: "ACTIVE", percent: 20, milestoneCount: 4, nextStep: "Set up the database" },
  goals: [{ id: "goal-1", title: "Build an app", lifeArea: "CAREER", status: "ACTIVE", percent: 20, milestoneCount: 4, nextStep: "Set up the database" }],
  quests: {
    today: { completed: 2, total: 5 },
    last7Days: { completed: 18, total: 30 },
    byArea: [
      { lifeArea: "PHYSICAL", completed: 6, total: 7 },
      { lifeArea: "SOCIAL", completed: 0, total: 5 },
    ],
    neglectedAreas: ["SOCIAL"],
    strongAreas: ["PHYSICAL"],
    recentReflections: [{ date: "2026-09-13", lifeArea: "PHYSICAL", note: "Felt great after the run" }],
    commonSkipReasons: ["NO_TIME"],
  },
};

describe("fallbackInsights", () => {
  it("produces schema-shaped, grounded insights from context", () => {
    const insights = fallbackInsights(baseContext);
    expect(insights.headline).toContain("Build an app");
    expect(insights.analysis.wins.join(" ")).toMatch(/physical/i);
    expect(insights.analysis.watchOuts.join(" ")).toMatch(/social/i);
    expect(insights.goalGuidance).toMatchObject({ goalId: "goal-1" });
    expect(insights.goalGuidance?.guidance).toContain("Set up the database");
    expect(insights.skillGaps[0]).toMatchObject({ label: "Build an app" });
  });

  it("guides a user with no goal toward creating one", () => {
    const insights = fallbackInsights({ ...baseContext, majorGoal: null, goals: [] });
    expect(insights.goalGuidance).toBeNull();
    expect(insights.recommendations.some((r) => r.href === "/goals/new")).toBe(true);
  });

  it("flags over-commitment when there are many active goals", () => {
    const goals = Array.from({ length: 5 }, (_, i) => ({
      id: `g${i}`,
      title: `Goal ${i}`,
      lifeArea: "CAREER" as const,
      status: "ACTIVE",
      percent: 0,
      milestoneCount: 0,
      nextStep: null,
    }));
    const insights = fallbackInsights({ ...baseContext, goals });
    expect(insights.analysis.watchOuts.some((w) => /active goals/i.test(w))).toBe(true);
  });
});

describe("mentor output schemas", () => {
  it("accepts a valid insights payload and rejects a malformed one", () => {
    const valid = {
      headline: "You're on your way.",
      analysis: { summary: "Good momentum.", wins: ["Ran twice"], watchOuts: [] },
      recommendations: [{ title: "Call a friend", detail: "You haven't connected this week." }],
      skillGaps: [],
    };
    expect(insightsSchema.safeParse(valid).success).toBe(true);
    // href/actionLabel/goalGuidance default in.
    const parsed = insightsSchema.parse(valid);
    expect(parsed.recommendations[0].href).toBeNull();
    expect(parsed.goalGuidance).toBeNull();

    expect(insightsSchema.safeParse({ headline: "x" }).success).toBe(false);
  });

  it("validates discovery lessons and rejects overlong ones", () => {
    const lesson = {
      title: "Why do we dream?",
      minutes: 4,
      hook: "It's stranger than it seems.",
      sections: [
        { heading: "REM sleep", body: "Dreams cluster in REM sleep." },
        { heading: "Theories", body: "Several theories compete." },
      ],
      keyIdea: "Dreaming's purpose is still debated.",
      reflectionPrompt: "How's your sleep been?",
      tags: ["sleep", "psychology"],
    };
    expect(discoverySchema.safeParse(lesson).success).toBe(true);
    expect(discoverySchema.safeParse({ ...lesson, minutes: 99 }).success).toBe(false);
    expect(discoverySchema.safeParse({ ...lesson, sections: [] }).success).toBe(false);
  });

  it("validates a quest-content set", () => {
    const set = {
      rationale: "Balanced and light today.",
      quests: [
        { slot: "PHYSICAL", title: "Walk by the river", description: "A gentle 20-minute walk.", steps: ["Head out", "Keep an easy pace"], difficulty: "EASY", estimatedMinutes: 20, rationale: "Matches your low energy." },
      ],
    };
    expect(questContentSetSchema.safeParse(set).success).toBe(true);
    expect(questContentSetSchema.safeParse({ rationale: "x", quests: [{ slot: "NOPE" }] }).success).toBe(false);
  });
});
