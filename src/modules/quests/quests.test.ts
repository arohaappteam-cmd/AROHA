import { describe, expect, it } from "vitest";

import { DEFAULT_PREFERENCES } from "@/modules/identity/preferences";

import { CORE_SLOTS } from "./categories";
import { questDraftSchema, type QuestGenerationContext } from "./context";
import { generateDay, generateSlot } from "./generator";
import { getLearningExperience, libraryLearningProvider } from "./learning";
import { LESSON_LIBRARY } from "./lessons";
import { readPayload } from "./payload";
import { createRng } from "./random";
import { questXpReward } from "./rewards";
import { allowedActions, dayProgress } from "./status";

const ctx = (overrides: Partial<QuestGenerationContext> = {}): QuestGenerationContext => ({
  userId: "user-1",
  date: "2026-09-13",
  energy: "NORMAL",
  preferences: { ...DEFAULT_PREFERENCES },
  interests: [],
  focusAreas: [],
  majorGoal: null,
  recentTemplateKeys: [],
  previousOutcomes: {},
  carryOvers: [],
  ...overrides,
});

const withGoal: QuestGenerationContext["majorGoal"] = {
  id: "goal-1",
  title: "Build an app",
  hasRoadmap: true,
  next: { milestoneTitle: "Backend", missionId: "mission-1", missionTitle: "Build the authentication system" },
};

const slotOf = (day: ReturnType<typeof generateDay>, slot: string) => day.drafts.find((d) => d.slot === slot)!;

describe("daily generation", () => {
  it("always creates exactly one quest for each of the five core categories", () => {
    for (const energy of ["LOW", "NORMAL", "HIGH"] as const) {
      for (let i = 0; i < 25; i++) {
        const day = generateDay(ctx({ energy, userId: `user-${i}`, date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}` }));
        const core = day.drafts.filter((d) => d.isCore);
        expect(core.map((d) => d.slot)).toEqual([...CORE_SLOTS]);
        expect(new Set(day.drafts.map((d) => d.slot)).size).toBe(day.drafts.length);
        for (const draft of day.drafts) expect(questDraftSchema.safeParse(draft).success).toBe(true);
      }
    }
  });

  it("is deterministic for the same user and day, and varies across days", () => {
    expect(generateDay(ctx())).toEqual(generateDay(ctx()));
    const titles = new Set(
      Array.from({ length: 10 }, (_, i) => generateDay(ctx({ date: `2026-10-${String(i + 1).padStart(2, "0")}` })).drafts.map((d) => d.templateKey).join("|")),
    );
    expect(titles.size).toBeGreaterThan(1);
  });

  it("follows movement preferences", () => {
    const gymOnly = ctx({ preferences: { ...DEFAULT_PREFERENCES, movementOptions: ["GYM"] } });
    const keys = Array.from({ length: 12 }, (_, i) => slotOf(generateDay({ ...gymOnly, date: `2026-11-${String(i + 1).padStart(2, "0")}` }), "PHYSICAL").templateKey);
    expect(keys.filter((k) => k === "physical.gym").length).toBeGreaterThan(6);
    // Without a gym, never a gym quest.
    const walker = ctx({ preferences: { ...DEFAULT_PREFERENCES, movementOptions: ["WALKING"] } });
    for (let i = 0; i < 12; i++) {
      expect(slotOf(generateDay({ ...walker, date: `2026-11-${String(i + 1).padStart(2, "0")}` }), "PHYSICAL").templateKey).not.toBe("physical.gym");
    }
  });

  it("makes low-energy days lighter and easier (spec §55)", () => {
    const busy = ctx({ preferences: { ...DEFAULT_PREFERENCES, dailyMinutes: 120, movementOptions: ["GYM", "RUNNING"] } });
    const normal = generateDay(busy);
    const low = generateDay({ ...busy, energy: "LOW" });
    const minutes = (d: typeof normal) => d.drafts.filter((q) => q.isCore).reduce((s, q) => s + q.estimatedMinutes, 0);
    expect(minutes(low)).toBeLessThan(minutes(normal));
    expect(slotOf(low, "PHYSICAL").templateKey).toMatch(/walk|mobility/);
    expect(low.drafts.every((q) => q.difficulty !== "HARD")).toBe(true);
    expect(low.drafts.some((q) => q.slot === "BONUS")).toBe(false);
  });

  it("scales time with the user's daily budget", () => {
    const short = generateDay(ctx({ preferences: { ...DEFAULT_PREFERENCES, dailyMinutes: 30 } }));
    const long = generateDay(ctx({ preferences: { ...DEFAULT_PREFERENCES, dailyMinutes: 120 } }));
    const total = (d: typeof short) => d.drafts.filter((q) => q.isCore).reduce((s, q) => s + q.estimatedMinutes, 0);
    expect(total(long)).toBeGreaterThan(total(short));
  });

  it("turns the major goal's next mission into the personal goal quest", () => {
    const quest = slotOf(generateDay(ctx({ majorGoal: withGoal })), "PERSONAL_GOAL");
    expect(quest.title).toContain("Build the authentication system");
    expect(quest).toMatchObject({ goalId: "goal-1", missionId: "mission-1", templateKey: "goal.mission" });
    expect(readPayload(quest.payload)).toMatchObject({ kind: "goal", href: "/goals/goal-1" });
  });

  it("gives a useful personal goal quest without a goal or roadmap", () => {
    expect(slotOf(generateDay(ctx()), "PERSONAL_GOAL").templateKey).toBe("goal.choose-goal");
    expect(slotOf(generateDay(ctx({ majorGoal: { ...withGoal, hasRoadmap: false, next: null } })), "PERSONAL_GOAL").templateKey).toBe("goal.map-roadmap");
    expect(slotOf(generateDay(ctx({ majorGoal: { ...withGoal, next: null } })), "PERSONAL_GOAL").templateKey).toBe("goal.review-finished-roadmap");
    expect(
      slotOf(generateDay(ctx({ majorGoal: { ...withGoal, next: { milestoneTitle: "Deploy", missionId: null, missionTitle: null } } })), "PERSONAL_GOAL").templateKey,
    ).toBe("goal.plan-milestone");
  });

  it("offers learning without a book when the user prefers lessons", () => {
    const learner = ctx({ preferences: { ...DEFAULT_PREFERENCES, learningFormats: ["AI_LESSONS"] } });
    const keys = Array.from({ length: 10 }, (_, i) => slotOf(generateDay({ ...learner, date: `2026-12-${String(i + 1).padStart(2, "0")}` }), "LEARNING").templateKey);
    expect(keys.every((k) => !k.startsWith("learning.reading"))).toBe(true);
    const lessonQuest = slotOf(generateDay(learner), "LEARNING");
    expect(lessonQuest.templateKey).toMatch(/^learning\.lesson:/);
    const payload = readPayload(lessonQuest.payload);
    expect(payload?.kind).toBe("lesson");
    if (payload?.kind === "lesson") expect(getLearningExperience(payload.provider, payload.lessonId)).not.toBeNull();
  });

  it("uses interests for practice quests", () => {
    const player = ctx({ interests: [{ label: "Guitar", lifeArea: null }], preferences: { ...DEFAULT_PREFERENCES, learningFormats: ["HANDS_ON"] } });
    const quests = Array.from({ length: 10 }, (_, i) => slotOf(generateDay({ ...player, date: `2027-01-${String(i + 1).padStart(2, "0")}` }), "LEARNING"));
    const practice = quests.filter((q) => q.templateKey.startsWith("learning.practice"));
    // Hands-on learners mostly get practice; the rest are micro-lessons.
    expect(practice.length).toBeGreaterThan(5);
    expect(practice.every((q) => q.title.toLowerCase().includes("guitar"))).toBe(true);
    expect(quests.every((q) => /^learning\.(practice|lesson)/.test(q.templateKey))).toBe(true);
  });

  it("avoids repeating recent quests and near-duplicates on the same day", () => {
    const first = generateDay(ctx());
    const next = generateDay(ctx({ date: "2026-09-14", recentTemplateKeys: first.drafts.map((d) => d.templateKey) }));
    const repeats = next.drafts.filter((d) => d.isCore && d.slot !== "PERSONAL_GOAL" && first.drafts.some((f) => f.templateKey === d.templateKey));
    expect(repeats.length).toBeLessThanOrEqual(2);

    for (let i = 0; i < 40; i++) {
      const day = generateDay(ctx({ userId: `walker-${i}`, preferences: { ...DEFAULT_PREFERENCES, movementOptions: ["WALKING"] } }));
      const walks = day.drafts.filter((d) => d.templateKey === "physical.walk" || d.templateKey === "mental.mindful-walk");
      expect(walks.length).toBeLessThanOrEqual(1);
    }
  });

  it("goes easier after a skipped day", () => {
    const tough = ctx({ preferences: { ...DEFAULT_PREFERENCES, challengeLevel: "AMBITIOUS" } });
    const after = slotOf(generateDay({ ...tough, previousOutcomes: { SOCIAL: "SKIPPED" } }), "SOCIAL");
    expect(after.rationale).toContain("simpler");
    const before = slotOf(generateDay(tough), "SOCIAL");
    const rank = { EASY: 0, MEDIUM: 1, HARD: 2 };
    expect(rank[after.difficulty]).toBeLessThanOrEqual(rank[before.difficulty] + 0);
  });

  it("carries deferred quests into the next day unchanged", () => {
    const yesterday = generateDay(ctx({ date: "2026-09-12" }));
    const deferred = slotOf(yesterday, "MENTAL");
    const today = generateDay(ctx({ carryOvers: [{ questId: "q-mental", draft: deferred }] }));
    const carried = slotOf(today, "MENTAL");
    expect(carried).toMatchObject({ title: deferred.title, templateKey: deferred.templateKey, carriedFromId: "q-mental" });
    expect(today.drafts.filter((d) => d.slot === "MENTAL")).toHaveLength(1);
  });

  it("adds a bonus quest only for creative or exploratory focus", () => {
    expect(generateDay(ctx()).drafts.some((d) => d.slot === "BONUS")).toBe(false);
    const bonus = generateDay(ctx({ focusAreas: ["CREATIVITY"] })).drafts.find((d) => d.slot === "BONUS");
    expect(bonus).toMatchObject({ isCore: false, lifeArea: "CREATIVITY" });
  });
});

describe("swapping a slot", () => {
  it("returns a different quest and never an excluded one", () => {
    const day = generateDay(ctx());
    const physical = slotOf(day, "PHYSICAL");
    const swapped = generateSlot(ctx(), "PHYSICAL", { nonce: 1, excludeTemplateKeys: [physical.templateKey] });
    expect(swapped?.templateKey).not.toBe(physical.templateKey);
    expect(generateSlot(ctx(), "PHYSICAL", { nonce: 1, excludeTemplateKeys: [physical.templateKey] })).toEqual(swapped);
  });
});

describe("learning library", () => {
  it("has complete, uniquely identified lessons", () => {
    expect(new Set(LESSON_LIBRARY.map((l) => l.id)).size).toBe(LESSON_LIBRARY.length);
    for (const lesson of LESSON_LIBRARY) {
      expect(lesson.sections.length).toBeGreaterThanOrEqual(2);
      expect(lesson.keyIdea.length).toBeGreaterThan(10);
      expect(lesson.reflectionPrompt.length).toBeGreaterThan(10);
      expect(lesson.minutes).toBeLessThanOrEqual(15);
    }
  });

  it("prefers lessons matching interests and avoids recent ones", () => {
    const picks = Array.from({ length: 40 }, (_, i) =>
      libraryLearningProvider.suggest({ interests: ["Investing", "Budgeting"], recentLessonIds: [], rng: createRng(`s${i}`) })!.id,
    );
    expect(picks.filter((id) => id === "compound-interest").length).toBeGreaterThan(5);
    const all = LESSON_LIBRARY.map((l) => l.id);
    const pick = libraryLearningProvider.suggest({ interests: [], recentLessonIds: all.slice(1), rng: createRng("x") });
    expect(pick?.id).toBe(all[0]);
  });
});

describe("quest rules", () => {
  const state = (overrides = {}) => ({ status: "PENDING" as const, slot: "PHYSICAL", isCore: true, carriedFromId: null, swapCount: 0, ...overrides });

  it("only allows actions that make sense", () => {
    expect(allowedActions(state(), true)).toEqual(["start", "complete", "skip", "defer", "swap"]);
    expect(allowedActions(state({ status: "IN_PROGRESS" }), true)).toEqual(["complete", "skip", "defer"]);
    expect(allowedActions(state({ status: "COMPLETED" }), true)).toEqual(["undo"]);
    expect(allowedActions(state({ status: "DEFERRED" }), true)).toEqual(["restore"]);
    expect(allowedActions(state(), false)).toEqual([]);
    // Once carried over, no second deferral and no swap.
    expect(allowedActions(state({ carriedFromId: "x" }), true)).toEqual(["start", "complete", "skip"]);
    expect(allowedActions(state({ slot: "PERSONAL_GOAL" }), true)).not.toContain("swap");
    expect(allowedActions(state({ swapCount: 2 }), true)).not.toContain("swap");
    expect(allowedActions(state({ isCore: false, slot: "BONUS" }), true)).not.toContain("defer");
  });

  it("prices quests deterministically", () => {
    expect(questXpReward("EASY", 10, true)).toBe(25);
    expect(questXpReward("MEDIUM", 30, true)).toBe(50);
    expect(questXpReward("HARD", 500, true)).toBe(100);
    expect(questXpReward("MEDIUM", 30, false)).toBe(40);
  });

  it("summarises the day", () => {
    const progress = dayProgress([
      { status: "COMPLETED", isCore: true, xpReward: 40 },
      { status: "SKIPPED", isCore: true, xpReward: 25 },
      { status: "IN_PROGRESS", isCore: true, xpReward: 30 },
      { status: "PENDING", isCore: true, xpReward: 25 },
      { status: "DEFERRED", isCore: true, xpReward: 50 },
      { status: "COMPLETED", isCore: false, xpReward: 40 },
    ]);
    expect(progress).toMatchObject({
      coreTotal: 5,
      coreCompleted: 1,
      coreResolved: 3,
      bonusCompleted: 1,
      inProgress: 1,
      plannedXp: 210,
      completedXp: 80,
      percent: 20,
      allCoreCompleted: false,
    });
  });
});
