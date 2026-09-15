import { describe, expect, it } from "vitest";

import {
  getLevelProgress,
  levelForXp,
  tierForLevel,
  xpRequiredForLevel,
} from "./levels";

describe("xpRequiredForLevel", () => {
  it("starts at zero for level 1", () => {
    expect(xpRequiredForLevel(1)).toBe(0);
  });

  it("follows the curve and strictly increases", () => {
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(xpRequiredForLevel(10)).toBe(2700);
    for (let level = 1; level < 150; level++) {
      expect(xpRequiredForLevel(level + 1)).toBeGreaterThan(
        xpRequiredForLevel(level),
      );
    }
  });

  it("rejects invalid levels", () => {
    expect(() => xpRequiredForLevel(0)).toThrow(RangeError);
    expect(() => xpRequiredForLevel(1.5)).toThrow(RangeError);
  });
});

describe("levelForXp", () => {
  it("maps level boundaries exactly", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(2699)).toBe(9);
    expect(levelForXp(2700)).toBe(10);
  });

  it("treats negative or fractional XP safely", () => {
    expect(levelForXp(-50)).toBe(1);
    expect(levelForXp(100.9)).toBe(2);
  });
});

describe("getLevelProgress", () => {
  it("reports progress within the current level", () => {
    const progress = getLevelProgress(150);
    expect(progress).toMatchObject({
      level: 2,
      totalXp: 150,
      xpIntoLevel: 50,
      xpForNextLevel: 182, // level 3 needs floor(100 * 2^1.5) = 282
      xpToNextLevel: 132,
      percent: 27,
    });
  });

  it("is 0% on a fresh character", () => {
    expect(getLevelProgress(0)).toMatchObject({ level: 1, percent: 0 });
  });
});

describe("tierForLevel", () => {
  it.each([
    [1, "Beginner"],
    [9, "Beginner"],
    [10, "Explorer"],
    [25, "Practitioner"],
    [50, "Advanced"],
    [100, "Master"],
    [240, "Master"],
  ])("level %i is %s", (level, title) => {
    expect(tierForLevel(level)).toBe(title);
  });
});
