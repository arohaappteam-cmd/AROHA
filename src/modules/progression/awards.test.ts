import { describe, expect, it } from "vitest";

import { ATTRIBUTES } from "./attributes";
import { attributeAwards, isAwardableXp, MAX_AWARDABLE_XP } from "./awards";
import { getLevelProgress, levelForXp, xpRequiredForLevel } from "./levels";

const LIFE_AREAS = [
  "PHYSICAL",
  "MENTAL",
  "LEARNING",
  "SOCIAL",
  "PERSONAL_GOAL",
  "CREATIVITY",
  "EXPERIENCES",
  "CAREER",
  "FINANCE",
  "SKILLS",
  "RELATIONSHIPS",
  "PERSONAL_DEVELOPMENT",
] as const;

describe("isAwardableXp", () => {
  it("accepts sane positive integers only", () => {
    expect(isAwardableXp(1)).toBe(true);
    expect(isAwardableXp(50)).toBe(true);
    expect(isAwardableXp(MAX_AWARDABLE_XP)).toBe(true);
  });

  it("rejects negative, zero, fractional, absurd and non-finite XP", () => {
    for (const bad of [0, -1, -100, 2.5, MAX_AWARDABLE_XP + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isAwardableXp(bad)).toBe(false);
    }
  });
});

describe("attributeAwards", () => {
  it("maps each of the five core quest areas to an attribute", () => {
    expect(attributeAwards("PHYSICAL", 40)).toEqual([{ attribute: "STRENGTH", amount: 40 }]);
    expect(attributeAwards("SOCIAL", 30)).toEqual([{ attribute: "SOCIAL", amount: 30 }]);
    expect(attributeAwards("LEARNING", 20).map((a) => a.attribute)).toEqual(["INTELLECT", "SKILLS"]);
    expect(attributeAwards("MENTAL", 20).map((a) => a.attribute)).toEqual(["DISCIPLINE", "INTELLECT"]);
    expect(attributeAwards("PERSONAL_GOAL", 50).map((a) => a.attribute)).toEqual(["DISCIPLINE", "SKILLS"]);
  });

  it("distributes exactly the XP awarded, for every area and amount", () => {
    for (const area of LIFE_AREAS) {
      for (let xp = 1; xp <= 120; xp++) {
        const awards = attributeAwards(area, xp);
        const total = awards.reduce((sum, a) => sum + a.amount, 0);
        expect(total).toBe(xp);
        expect(awards.every((a) => a.amount > 0)).toBe(true);
        expect(awards.every((a) => ATTRIBUTES.some((meta) => meta.key === a.attribute))).toBe(true);
      }
    }
  });

  it("is deterministic and awards nothing for invalid XP", () => {
    expect(attributeAwards("LEARNING", 25)).toEqual(attributeAwards("LEARNING", 25));
    expect(attributeAwards("PHYSICAL", 0)).toEqual([]);
    expect(attributeAwards("PHYSICAL", -40)).toEqual([]);
  });
});

describe("level boundaries", () => {
  it("levels up exactly at the threshold, not before", () => {
    const threshold = xpRequiredForLevel(3); // 282
    expect(levelForXp(threshold - 1)).toBe(2);
    expect(levelForXp(threshold)).toBe(3);
    expect(getLevelProgress(threshold)).toMatchObject({ level: 3, xpIntoLevel: 0, percent: 0 });
  });

  it("can cross several levels in one jump", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpRequiredForLevel(5))).toBe(5);
  });
});
