import { describe, expect, it } from "vitest";

import type { AssessmentKind } from "@/generated/prisma/enums";

import { isAtLeast, proofStrength, proofTier } from "./tiers";

const facts = (overrides: Partial<{ xp: number; atMaxLevel: boolean; passed: AssessmentKind[]; provenProjects: number }>) => ({
  xp: overrides.xp ?? 0,
  atMaxLevel: overrides.atMaxLevel ?? false,
  passedKinds: new Set(overrides.passed ?? []),
  provenProjects: overrides.provenProjects ?? 0,
});

describe("proof tiers", () => {
  it("separates practice, understanding, ability and mastery", () => {
    expect(proofTier(facts({}))).toBe("NONE");
    expect(proofTier(facts({ xp: 120 }))).toBe("PRACTICED");
    expect(proofTier(facts({ xp: 120, passed: ["QUIZ"] }))).toBe("TESTED");
    expect(proofTier(facts({ xp: 120, provenProjects: 1 }))).toBe("DEMONSTRATED");
    expect(proofTier(facts({ passed: ["PRACTICAL"] }))).toBe("DEMONSTRATED");
    expect(proofTier(facts({ atMaxLevel: true, xp: 900, passed: ["PROJECT"] }))).toBe("MASTERED");
  });

  it("never treats XP alone — or XP plus a quiz — as mastery", () => {
    expect(proofTier(facts({ atMaxLevel: true, xp: 9_999 }))).toBe("PRACTICED");
    expect(proofTier(facts({ atMaxLevel: true, xp: 9_999, passed: ["QUIZ"] }))).toBe("TESTED");
    // A project without an assessed review demonstrates, but doesn't confirm mastery.
    expect(proofTier(facts({ atMaxLevel: true, xp: 9_999, provenProjects: 3 }))).toBe("DEMONSTRATED");
  });

  it("ranks any proof above any amount of practice", () => {
    expect(proofStrength(facts({ passed: ["QUIZ"] }))).toBeGreaterThan(proofStrength(facts({ xp: 1_000_000 })));
    expect(proofStrength(facts({ provenProjects: 1 }))).toBeGreaterThan(proofStrength(facts({ xp: 5_000, passed: ["QUIZ"] })));
    expect(isAtLeast("MASTERED", "DEMONSTRATED")).toBe(true);
    expect(isAtLeast("TESTED", "DEMONSTRATED")).toBe(false);
  });
});
