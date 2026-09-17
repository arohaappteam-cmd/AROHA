import { describe, expect, it } from "vitest";

import { ACHIEVEMENTS, earnedAchievements, EMPTY_FACTS, findAchievement } from "./catalogue";

const slugsOf = (facts: Parameters<typeof earnedAchievements>[0]) => earnedAchievements(facts).map((a) => a.slug);

describe("achievement catalogue", () => {
  it("covers the required achievements with unique slugs and sane rewards", () => {
    const slugs = ACHIEVEMENTS.map((achievement) => achievement.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of ["first-quest", "first-project", "first-book", "quests-100", "challenge-7", "challenge-30", "first-major-goal", "skill-milestone"]) {
      expect(findAchievement(slug), slug).toBeDefined();
    }
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.xpReward).toBeGreaterThan(0);
      expect(achievement.xpReward).toBeLessThanOrEqual(500);
      expect(achievement.hint.length).toBeGreaterThan(0);
    }
  });

  it("unlocks nothing on a fresh account", () => {
    expect(slugsOf(EMPTY_FACTS)).toEqual([]);
  });

  it("evaluates every rule deterministically from facts", () => {
    expect(slugsOf({ ...EMPTY_FACTS, questsCompleted: 1 })).toEqual(["first-quest"]);
    expect(slugsOf({ ...EMPTY_FACTS, questsCompleted: 25 })).toEqual(["first-quest", "quests-25"]);
    expect(slugsOf({ ...EMPTY_FACTS, questsCompleted: 100 })).toContain("quests-100");
    expect(slugsOf({ ...EMPTY_FACTS, projectsCompleted: 1 })).toEqual(["first-project"]);
    expect(slugsOf({ ...EMPTY_FACTS, projectsCompleted: 3 })).toEqual(["first-project", "builder"]);
    expect(slugsOf({ ...EMPTY_FACTS, abilityDemonstrated: true })).toEqual(["proof-over-claims"]);
    expect(slugsOf({ ...EMPTY_FACTS, readingQuestsCompleted: 10 })).toEqual(["first-book"]);
    expect(slugsOf({ ...EMPTY_FACTS, readingQuestsCompleted: 9 })).toEqual([]);
    expect(slugsOf({ ...EMPTY_FACTS, goalsCompleted: 1 })).toEqual(["first-major-goal"]);
    expect(slugsOf({ ...EMPTY_FACTS, experimentsReviewed: 1 })).toEqual(["curious-mind"]);
    expect(slugsOf({ ...EMPTY_FACTS, reflectionDays: 6 })).toEqual([]);
    expect(slugsOf({ ...EMPTY_FACTS, reflectionDays: 7 })).toEqual(["reflective-week"]);
    expect(slugsOf({ ...EMPTY_FACTS, maxSkillLevel: 3 })).toEqual(["skill-milestone"]);
    expect(slugsOf({ ...EMPTY_FACTS, hasMasteredSkill: true, maxSkillLevel: 5 })).toEqual(
      expect.arrayContaining(["skill-milestone", "skill-mastery"]),
    );
  });

  it("grades challenge achievements by the completed window length", () => {
    expect(slugsOf({ ...EMPTY_FACTS, longestChallengeCompleted: 2 })).toEqual([]);
    expect(slugsOf({ ...EMPTY_FACTS, longestChallengeCompleted: 7 })).toEqual(["challenge-7"]);
    expect(slugsOf({ ...EMPTY_FACTS, longestChallengeCompleted: 30 })).toEqual(
      expect.arrayContaining(["challenge-7", "challenge-30"]),
    );
  });
});
