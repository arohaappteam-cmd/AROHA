import { describe, expect, it } from "vitest";

import { deadlineState, describeDeadline, todayInTimezone } from "./dates";
import { computeRoadmapProgress, deriveMilestoneStatus, goalPercent, nextStep, type MilestoneState } from "./progress";
import { roadmapDraftSchema, type RoadmapContext } from "./roadmap";
import { createGoalSchema, goalInputSchema } from "./schemas";
import { applyTransition, canTransition } from "./status";
import { generateRuleBasedRoadmap } from "./templates";

const ctx = (overrides: Partial<RoadmapContext> = {}): RoadmapContext => ({
  title: "Learn Programming",
  description: null,
  lifeArea: "LEARNING",
  motivation: null,
  target: null,
  startingPoint: "NEW",
  challengeLevel: "BALANCED",
  interests: [],
  ...overrides,
});

describe("goal transitions", () => {
  it("allows only valid lifecycle moves", () => {
    expect(canTransition("ACTIVE", "pause")).toBe(true);
    expect(canTransition("PAUSED", "resume")).toBe(true);
    expect(canTransition("PAUSED", "complete")).toBe(true);
    expect(canTransition("COMPLETED", "reopen")).toBe(true);
    expect(canTransition("COMPLETED", "pause")).toBe(false);
    expect(canTransition("ACTIVE", "resume")).toBe(false);
  });

  it("sets and clears timestamps", () => {
    const now = new Date("2026-09-13T10:00:00Z");
    expect(applyTransition("ACTIVE", "pause", now)).toEqual({ status: "PAUSED", pausedAt: now });
    expect(applyTransition("PAUSED", "complete", now)).toEqual({ status: "COMPLETED", completedAt: now, pausedAt: null });
    expect(applyTransition("COMPLETED", "reopen", now)).toEqual({ status: "ACTIVE", completedAt: null });
    expect(() => applyTransition("COMPLETED", "complete", now)).toThrow();
  });
});

describe("milestone status derivation", () => {
  it("follows missions", () => {
    expect(deriveMilestoneStatus("PENDING", ["PENDING", "PENDING"])).toBe("PENDING");
    expect(deriveMilestoneStatus("PENDING", ["COMPLETED", "PENDING"])).toBe("IN_PROGRESS");
    expect(deriveMilestoneStatus("PENDING", ["COMPLETED", "SKIPPED"])).toBe("COMPLETED");
    expect(deriveMilestoneStatus("PENDING", ["SKIPPED", "SKIPPED"])).toBe("SKIPPED");
    expect(deriveMilestoneStatus("COMPLETED", ["COMPLETED", "PENDING"])).toBe("IN_PROGRESS");
  });

  it("keeps a manual status when there are no missions", () => {
    expect(deriveMilestoneStatus("COMPLETED", [])).toBe("COMPLETED");
  });
});

const roadmap: MilestoneState[] = [
  {
    id: "m1",
    title: "Fundamentals",
    status: "COMPLETED",
    missions: [
      { id: "a", title: "Variables", status: "COMPLETED" },
      { id: "b", title: "Loops", status: "SKIPPED" },
    ],
  },
  {
    id: "m2",
    title: "Python",
    status: "IN_PROGRESS",
    missions: [
      { id: "c", title: "Setup", status: "COMPLETED" },
      { id: "d", title: "Lists", status: "PENDING" },
    ],
  },
  { id: "m3", title: "Projects", status: "PENDING", missions: [] },
];

describe("roadmap progress", () => {
  it("excludes skipped missions from the denominator", () => {
    expect(computeRoadmapProgress(roadmap)).toMatchObject({
      totalMissions: 4,
      completedMissions: 2,
      skippedMissions: 1,
      percent: 66,
      completedMilestones: 1,
      roadmapDone: false,
    });
  });

  it("falls back to milestones when there are no missions", () => {
    const p = computeRoadmapProgress([
      { id: "x", title: "A", status: "COMPLETED", missions: [] },
      { id: "y", title: "B", status: "PENDING", missions: [] },
    ]);
    expect(p.percent).toBe(50);
  });

  it("is zero with no roadmap and 100 for completed goals", () => {
    const empty = computeRoadmapProgress([]);
    expect(empty.percent).toBe(0);
    expect(goalPercent("COMPLETED", empty)).toBe(100);
  });

  it("finds the next concrete step", () => {
    expect(nextStep(roadmap)).toEqual({ milestone: { id: "m2", title: "Python" }, mission: { id: "d", title: "Lists" } });
    expect(nextStep([roadmap[2]])).toEqual({ milestone: { id: "m3", title: "Projects" }, mission: null });
    expect(nextStep([roadmap[0]])).toBeNull();
  });
});

describe("rule-based roadmap generation", () => {
  it("matches the spec's programming example", () => {
    const { draft, generator } = generateRuleBasedRoadmap(ctx());
    expect(generator).toBe("rule-based@1:programming");
    expect(draft.milestones.map((m) => m.title)).toEqual(["Fundamentals", "Python", "Problem Solving", "Projects"]);
    const missions = draft.milestones.flatMap((m) => m.missions.map((x) => x.title));
    expect(missions).toContain("Learn variables and data types");
    expect(missions).toContain("Build a calculator");
    expect(missions).toContain("Build and share your first project");
  });

  it("skips foundations for experienced users and compresses for some experience", () => {
    const experienced = generateRuleBasedRoadmap(ctx({ startingPoint: "EXPERIENCED" })).draft;
    expect(experienced.milestones[0].title).toBe("Python");
    const some = generateRuleBasedRoadmap(ctx({ startingPoint: "SOME_EXPERIENCE" })).draft;
    expect(some.milestones[0].missions).toHaveLength(1);
  });

  it("keeps stages small for a gentle challenge level", () => {
    const { draft } = generateRuleBasedRoadmap(ctx({ challengeLevel: "GENTLE" }));
    expect(draft.milestones.every((m) => m.missions.length <= 2)).toBe(true);
  });

  it("picks templates for people from any walk of life", () => {
    const key = (title: string) => generateRuleBasedRoadmap(ctx({ title })).generator.split(":")[1];
    expect(key("Run a half marathon")).toBe("running");
    expect(key("Learn guitar")).toBe("instrument");
    expect(key("Speak Spanish with my in-laws")).toBe("language");
    expect(key("Open a small bakery")).toBe("business");
    expect(key("Save an emergency fund")).toBe("finance");
    expect(key("Get stronger for work shifts")).toBe("strength");
    expect(key("Plant a vegetable garden")).toBe("generic");
  });

  it("uses the goal's own words in instruments, languages and targets", () => {
    const guitar = generateRuleBasedRoadmap(ctx({ title: "Learn piano" })).draft;
    expect(guitar.milestones[0].missions[0].title).toContain("piano");
    const generic = generateRuleBasedRoadmap(ctx({ title: "Plant a garden", target: "Harvest tomatoes" })).draft;
    expect(generic.milestones.at(-1)!.missions.at(-1)!.title).toContain("Harvest tomatoes");
  });

  it("always produces drafts that pass the shared roadmap contract", () => {
    for (const title of ["Learn Programming", "Run a 10k", "Write a novel", "Meditate daily", "Something unusual"]) {
      for (const startingPoint of ["NEW", "SOME_EXPERIENCE", "EXPERIENCED"] as const) {
        const { draft } = generateRuleBasedRoadmap(ctx({ title, startingPoint }));
        expect(roadmapDraftSchema.safeParse(draft).success).toBe(true);
      }
    }
  });
});

describe("goal input", () => {
  const base = { title: "Learn guitar", lifeArea: "CREATIVITY" };

  it("normalises optional fields", () => {
    expect(goalInputSchema.parse({ ...base, motivation: " ", deadline: "" })).toMatchObject({
      motivation: null,
      deadline: null,
      startingPoint: "NEW",
    });
    expect(createGoalSchema.parse(base).generateRoadmap).toBe(true);
  });

  it("rejects bad titles, areas and dates", () => {
    expect(goalInputSchema.safeParse({ ...base, title: "ab" }).success).toBe(false);
    expect(goalInputSchema.safeParse({ ...base, lifeArea: "HOBBY" }).success).toBe(false);
    expect(goalInputSchema.safeParse({ ...base, deadline: "2026-02-30" }).success).toBe(false);
    expect(goalInputSchema.safeParse({ ...base, deadline: "13/09/2026" }).success).toBe(false);
    expect(goalInputSchema.safeParse({ ...base, deadline: "2026-12-31" }).success).toBe(true);
  });
});

describe("deadlines", () => {
  it("uses the user's calendar day", () => {
    const now = new Date("2026-09-13T20:00:00Z");
    expect(todayInTimezone("Asia/Kolkata", now)).toBe("2026-09-14");
    expect(todayInTimezone("America/New_York", now)).toBe("2026-09-13");
  });

  it("describes how close a deadline is", () => {
    expect(deadlineState(null, "2026-09-13")).toEqual({ kind: "none" });
    expect(deadlineState("2026-09-10", "2026-09-13")).toEqual({ kind: "overdue", days: 3 });
    expect(describeDeadline("2026-09-13", "2026-09-13")).toBe("Due today");
    expect(describeDeadline("2026-09-14", "2026-09-13")).toBe("1 day left");
    expect(describeDeadline("2027-01-01", "2026-09-13")).toBe("Due Jan 1, 2027");
  });
});
