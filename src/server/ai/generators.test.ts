import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
  getEnv: () => ({ NODE_ENV: "test", DATABASE_URL: "postgresql://x", AI_PROVIDER: "mock", AI_MODEL: "claude-opus-5" }),
}));

import { DEFAULT_PREFERENCES } from "@/modules/identity/preferences";
import type { RoadmapContext } from "@/modules/goals/roadmap";
import type { QuestGenerationContext } from "@/modules/quests/context";

import { getMockAIProvider, resetAIProviderForTests } from "./index";
import { aiQuestGenerator } from "./quest-generator";
import { aiRoadmapGenerator } from "./roadmap-generator";

const questCtx = (overrides: Partial<QuestGenerationContext> = {}): QuestGenerationContext => ({
  userId: "user-1",
  date: "2026-09-14",
  energy: "NORMAL",
  preferences: { ...DEFAULT_PREFERENCES },
  interests: [{ label: "Guitar", lifeArea: null }],
  focusAreas: [],
  majorGoal: { id: "goal-1", title: "Build an app", hasRoadmap: true, next: { milestoneTitle: "Backend", missionId: "m1", missionTitle: "Set up the database" } },
  recentTemplateKeys: [],
  previousOutcomes: {},
  carryOvers: [],
  ...overrides,
});

const personalised = {
  rationale: "A calm, focused day.",
  quests: [
    { slot: "PHYSICAL", title: "Riverside walk", description: "A gentle walk to start the day.", steps: ["Step out", "Easy pace"], difficulty: "EASY", estimatedMinutes: 20, rationale: "Matches your energy." },
    { slot: "MENTAL", title: "Two minutes of breathing", description: "Reset with box breathing.", steps: ["In for 4", "Out for 4"], difficulty: "EASY", estimatedMinutes: 5, rationale: "Quick reset." },
    { slot: "LEARNING", title: "Ten minutes of guitar theory", description: "Learn one new idea.", steps: ["Pick a concept", "Try it"], difficulty: "MEDIUM", estimatedMinutes: 15, rationale: "You love guitar." },
    { slot: "SOCIAL", title: "Message a bandmate", description: "Reconnect with someone musical.", steps: ["Send a note"], difficulty: "EASY", estimatedMinutes: 10, rationale: "Keeps you social." },
  ],
};

beforeEach(() => resetAIProviderForTests());

describe("aiQuestGenerator", () => {
  it("personalises the four non-goal core quests and keeps the goal quest deterministic", async () => {
    getMockAIProvider().register("quests.personalise-daily", () => personalised);
    const day = await aiQuestGenerator.generateDay(questCtx());

    expect(day.generator).toBe("mock");
    const bySlot = Object.fromEntries(day.drafts.map((d) => [d.slot, d]));
    expect(bySlot.PHYSICAL.title).toBe("Riverside walk");
    expect(bySlot.LEARNING.title).toContain("guitar");
    // Goal quest stays backend-owned: its link is intact and untouched by AI.
    expect(bySlot.PERSONAL_GOAL.title).toContain("Set up the database");
    expect(bySlot.PERSONAL_GOAL).toMatchObject({ goalId: "goal-1", missionId: "m1" });
    // Still exactly one quest per slot.
    expect(new Set(day.drafts.map((d) => d.slot)).size).toBe(day.drafts.length);
  });

  it("falls back to the deterministic day when the model has no handler", async () => {
    const day = await aiQuestGenerator.generateDay(questCtx());
    expect(day.generator).toBe("rule-based@1");
    expect(day.drafts.filter((d) => d.isCore)).toHaveLength(5);
  });

  it("ignores schema-invalid AI output and keeps the deterministic day", async () => {
    getMockAIProvider().register("quests.personalise-daily", () => ({ rationale: "x", quests: [{ slot: "PHYSICAL", title: "" }] }));
    const day = await aiQuestGenerator.generateDay(questCtx());
    expect(day.generator).toBe("rule-based@1");
  });

  it("never rewrites carried-over quests", async () => {
    getMockAIProvider().register("quests.personalise-daily", () => personalised);
    const carry = {
      questId: "old-mental",
      draft: { slot: "MENTAL" as const, lifeArea: "MENTAL" as const, isCore: true, templateKey: "mental.journal", title: "Journal for 10 minutes", description: "d", steps: ["write"], payload: null, difficulty: "EASY" as const, estimatedMinutes: 10, rationale: "carried", goalId: null, missionId: null, carriedFromId: null },
    };
    const day = await aiQuestGenerator.generateDay(questCtx({ carryOvers: [carry] }));
    // Carry-overs make the whole day deterministic.
    expect(day.generator).toBe("rule-based@1");
    expect(day.drafts.find((d) => d.slot === "MENTAL")?.title).toBe("Journal for 10 minutes");
  });
});

describe("aiRoadmapGenerator", () => {
  const ctx: RoadmapContext = {
    title: "Learn guitar",
    description: null,
    lifeArea: "CREATIVITY",
    motivation: null,
    target: "Play five songs",
    startingPoint: "NEW",
    challengeLevel: "BALANCED",
    interests: ["Guitar"],
  };

  it("uses validated AI output when available", async () => {
    getMockAIProvider().register("goals.roadmap", () => ({
      summary: "A steady path from first chords to songs.",
      milestones: [
        { title: "First sounds", description: null, missions: [{ title: "Tune the guitar", description: null }] },
        { title: "Play songs", description: null, missions: [{ title: "Learn one song", description: null }] },
      ],
    }));
    const result = await aiRoadmapGenerator.generate(ctx);
    expect(result.generator).toBe("mock");
    expect(result.draft.milestones.map((m) => m.title)).toEqual(["First sounds", "Play songs"]);
  });

  it("falls back to templates when AI output is invalid", async () => {
    getMockAIProvider().register("goals.roadmap", () => ({ milestones: [] }));
    const result = await aiRoadmapGenerator.generate(ctx);
    expect(result.generator).toMatch(/^rule-based@1/);
    expect(result.draft.milestones.length).toBeGreaterThan(0);
  });
});
