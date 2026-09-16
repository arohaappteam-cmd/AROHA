import { describe, expect, it } from "vitest";

import { MAX_AWARDABLE_XP } from "@/modules/progression/awards";

import { CHALLENGE_TEMPLATES, findChallengeTemplate } from "./catalogue";
import {
  challengeEndDate,
  challengeProgress,
  challengeTargetDays,
  challengeXpReward,
  graceDays,
  isWithinWindow,
  questEarnsChallengeDay,
} from "./logic";

describe("challenge catalogue", () => {
  it("includes the spec's example challenges with sane windows", () => {
    for (const key of ["reading-7", "fitness-30", "coding-14", "meditation-21"]) {
      expect(findChallengeTemplate(key), key).toBeDefined();
    }
    for (const template of CHALLENGE_TEMPLATES) {
      expect(template.durationDays).toBeGreaterThanOrEqual(2);
      expect(template.durationDays).toBeLessThanOrEqual(60);
      const hasMatcher = template.match.templateKeys?.length || template.match.lifeAreas?.length || template.match.skillTrees?.length;
      expect(hasMatcher, template.key).toBeTruthy();
    }
  });
});

describe("grace and pricing", () => {
  it("forgives one day per week so a miss never sinks the challenge", () => {
    expect(graceDays(7)).toBe(1);
    expect(graceDays(14)).toBe(2);
    expect(graceDays(30)).toBe(4);
    expect(graceDays(2)).toBe(0);
    expect(challengeTargetDays(7)).toBe(6);
    expect(challengeTargetDays(30)).toBe(26);
    expect(challengeTargetDays(2)).toBe(2);
  });

  it("prices the bonus from real days of work, capped like every award", () => {
    expect(challengeXpReward(6)).toBe(90);
    expect(challengeXpReward(26)).toBe(390);
    expect(challengeXpReward(1000)).toBe(MAX_AWARDABLE_XP);
  });
});

describe("window and matching", () => {
  it("computes the window inclusively", () => {
    expect(challengeEndDate("2026-09-10", 7)).toBe("2026-09-16");
    expect(isWithinWindow("2026-09-10", 7, "2026-09-10")).toBe(true);
    expect(isWithinWindow("2026-09-10", 7, "2026-09-16")).toBe(true);
    expect(isWithinWindow("2026-09-10", 7, "2026-09-17")).toBe(false);
    expect(isWithinWindow("2026-09-10", 7, "2026-09-09")).toBe(false);
  });

  it("credits days by template key, life area, or trained skill tree", () => {
    const reading = findChallengeTemplate("reading-7")!;
    expect(questEarnsChallengeDay(reading.match, { lifeArea: "LEARNING", templateKey: "learning.reading", skillTree: null })).toBe(true);
    expect(questEarnsChallengeDay(reading.match, { lifeArea: "LEARNING", templateKey: "learning.video", skillTree: null })).toBe(false);

    const fitness = findChallengeTemplate("fitness-30")!;
    expect(questEarnsChallengeDay(fitness.match, { lifeArea: "PHYSICAL", templateKey: "physical.anything", skillTree: "fitness" })).toBe(true);

    const coding = findChallengeTemplate("coding-14")!;
    expect(questEarnsChallengeDay(coding.match, { lifeArea: "PERSONAL_GOAL", templateKey: "goal.mission", skillTree: "programming" })).toBe(true);
    expect(questEarnsChallengeDay(coding.match, { lifeArea: "PERSONAL_GOAL", templateKey: "goal.mission", skillTree: "music" })).toBe(false);
  });
});

describe("challenge progress", () => {
  const challenge = { startDate: "2026-09-10", durationDays: 7, targetDays: 6 };

  it("reports days done, days left and whether the target is still in reach", () => {
    const midway = challengeProgress(challenge, 3, "2026-09-13");
    expect(midway).toMatchObject({ daysDone: 3, targetDays: 6, percent: 50, daysLeft: 4, stillPossible: true });

    // 2 days done with 3 window days left (14th–16th) can still reach 5… not 6.
    const slipping = challengeProgress(challenge, 2, "2026-09-14");
    expect(slipping).toMatchObject({ daysLeft: 3, stillPossible: false });
  });

  it("caps percent and handles a window that has closed", () => {
    const done = challengeProgress(challenge, 6, "2026-09-15");
    expect(done.percent).toBe(100);
    const over = challengeProgress(challenge, 4, "2026-09-20");
    expect(over).toMatchObject({ daysLeft: 0, stillPossible: false });
  });
});
