import { describe, expect, it } from "vitest";

import { findTreeSpec } from "@/modules/skills/catalogue";
import { matchQuestToSkill } from "@/modules/skills/matching";
import { allowedActions } from "@/modules/quests/status";

import { EXPERIMENT_TEMPLATES, findExperimentTemplate } from "./catalogue";
import {
  customExperimentSchema,
  experimentDayNumber,
  experimentEndDate,
  experimentProgress,
  experimentQuestContent,
  experimentReviewSchema,
  experimentXpReward,
  isExperimentSlot,
  skillTreeForTopic,
  windowHasEnded,
} from "./logic";

describe("experiment catalogue", () => {
  it("covers the spec's examples with real skill trees", () => {
    for (const key of ["coding-14", "photography-7", "meditation-10", "writing-14", "entrepreneurship-30"]) {
      expect(findExperimentTemplate(key), key).toBeDefined();
    }
    for (const template of EXPERIMENT_TEMPLATES) {
      if (template.skillTree) expect(findTreeSpec(template.skillTree), template.key).toBeDefined();
      expect(template.dailyIdeas.length).toBeGreaterThan(0);
      expect(template.durationDays).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("experiment window", () => {
  it("numbers days and knows when the review is due", () => {
    expect(experimentEndDate("2026-09-10", 7)).toBe("2026-09-16");
    expect(experimentDayNumber("2026-09-10", 7, "2026-09-10")).toBe(1);
    expect(experimentDayNumber("2026-09-10", 7, "2026-09-16")).toBe(7);
    expect(experimentDayNumber("2026-09-10", 7, "2026-09-17")).toBeNull();
    expect(windowHasEnded("2026-09-10", 7, "2026-09-16")).toBe(false);
    expect(windowHasEnded("2026-09-10", 7, "2026-09-17")).toBe(true);
    expect(experimentProgress({ startDate: "2026-09-10", durationDays: 7 }, 3, "2026-09-13")).toMatchObject({
      dayNumber: 4,
      daysPracticed: 3,
      daysLeft: 4,
      percent: 42,
    });
  });

  it("rewards curiosity per day actually tried, capped", () => {
    expect(experimentXpReward(0)).toBe(0);
    expect(experimentXpReward(6)).toBe(60);
    expect(experimentXpReward(30)).toBe(150);
  });
});

describe("experiment quests", () => {
  const photography = { ...findExperimentTemplate("photography-7")!, templateKey: "photography-7" };

  it("rotate through the template's ideas and route practice to the skill tree", () => {
    const day1 = experimentQuestContent(photography, 1);
    const day2 = experimentQuestContent(photography, 2);
    expect(day1.title).not.toBe(day2.title);
    expect(experimentQuestContent(photography, 8).title).toBe(day1.title);
    expect(day1).toMatchObject({ templateKey: "experiment.photography", estimatedMinutes: 20 });
    expect(day1.description).toContain("Day 1 of 7");

    const match = matchQuestToSkill({ lifeArea: "CREATIVITY", templateKey: day1.templateKey, title: day1.title });
    expect(match).toMatchObject({ treeSlug: "photography", skillSlug: null, reason: "experiment" });
    // An experiment without a tree trains no skill rather than guessing.
    expect(matchQuestToSkill({ lifeArea: "MENTAL", templateKey: "experiment.general", title: "Sit and breathe" })).toBeNull();
  });

  it("builds ideas for custom experiments and matches their topic to a tree", () => {
    const custom = experimentQuestContent({ title: "Try pottery for 5 days", topic: "pottery", templateKey: "custom", skillTree: null, durationDays: 5, dailyMinutes: 30 }, 2);
    expect(custom.title).toContain("pottery");
    expect(custom.templateKey).toBe("experiment.general");
    expect(skillTreeForTopic("learning Spanish")).toBe("languages");
    expect(skillTreeForTopic("pottery")).toBeNull();
  });

  it("can't be swapped or deferred — they follow their experiment", () => {
    expect(isExperimentSlot("EXPERIMENT")).toBe(true);
    expect(isExperimentSlot("EXPERIMENT_2")).toBe(true);
    expect(isExperimentSlot("BONUS")).toBe(false);
    const actions = allowedActions({ status: "PENDING", slot: "EXPERIMENT_2", isCore: false, carriedFromId: null, swapCount: 0 }, true);
    expect(actions).not.toContain("swap");
    expect(actions).not.toContain("defer");
    expect(actions).toContain("complete");
  });
});

describe("experiment inputs", () => {
  it("bounds custom experiments", () => {
    expect(customExperimentSchema.safeParse({ topic: "Pottery", durationDays: "7", dailyMinutes: "30", lifeArea: "CREATIVITY" }).success).toBe(true);
    expect(customExperimentSchema.safeParse({ topic: "Pottery", durationDays: 2, dailyMinutes: 30, lifeArea: "CREATIVITY" }).success).toBe(false);
    expect(customExperimentSchema.safeParse({ topic: "Pottery", durationDays: 31, dailyMinutes: 30, lifeArea: "CREATIVITY" }).success).toBe(false);
  });

  it("asks every review question", () => {
    const review = { experimentId: "e1", enjoyment: 4, interest: 5, improvement: "A_LITTLE", decision: "MAKE_IT_A_GOAL", learned: "I like light." };
    expect(experimentReviewSchema.safeParse(review).success).toBe(true);
    expect(experimentReviewSchema.safeParse({ ...review, enjoyment: 6 }).success).toBe(false);
    expect(experimentReviewSchema.safeParse({ ...review, learned: "" }).success).toBe(false);
    expect(experimentReviewSchema.safeParse({ ...review, decision: "MAYBE" }).success).toBe(false);
  });
});
