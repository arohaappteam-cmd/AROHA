import { describe, expect, it } from "vitest";

import {
  canAddMore,
  canUseJourneyRange,
  hasFeature,
  includesTier,
  limitFor,
  limitReachedMessage,
  nextTierFor,
  parsePlanTier,
  PLAN_TIERS,
  PLANS,
} from "./catalogue";

describe("plan tiers", () => {
  it("orders Free < Pro < Premium", () => {
    expect(includesTier("PREMIUM", "PRO")).toBe(true);
    expect(includesTier("PRO", "PREMIUM")).toBe(false);
    expect(includesTier("FREE", "FREE")).toBe(true);
  });

  it("puts analytics in Pro and AI in Premium", () => {
    expect(hasFeature("FREE", "insights")).toBe(false);
    expect(hasFeature("PRO", "insights")).toBe(true);
    expect(hasFeature("PRO", "ai")).toBe(false);
    expect(hasFeature("PREMIUM", "ai")).toBe(true);
    expect(hasFeature("PREMIUM", "insights")).toBe(true);
  });

  it("never takes anything away from a higher tier", () => {
    for (const [lower, higher] of [
      ["FREE", "PRO"],
      ["PRO", "PREMIUM"],
    ] as const) {
      for (const limit of ["activeGoals", "activeProjects", "activeExperiments"] as const) {
        const low = limitFor(lower, limit);
        const high = limitFor(higher, limit);
        expect(high === null || (low !== null && high >= low)).toBe(true);
      }
    }
  });

  it("counts limits against what's already active", () => {
    expect(canAddMore("FREE", "activeGoals", 2)).toBe(true);
    expect(canAddMore("FREE", "activeGoals", 3)).toBe(false);
    expect(canAddMore("PRO", "activeGoals", 300)).toBe(true);
    expect(canAddMore("FREE", "activeExperiments", 1)).toBe(false);
    expect(canAddMore("PRO", "activeExperiments", 1)).toBe(true);
  });

  it("points to the next tier that raises a limit", () => {
    expect(nextTierFor("FREE", "activeGoals")).toBe("PRO");
    expect(nextTierFor("PRO", "activeGoals")).toBeNull();
    expect(nextTierFor("PRO", "activeExperiments")).toBeNull();
  });

  it("explains a reached limit with a way forward", () => {
    const message = limitReachedMessage("FREE", "activeGoals");
    expect(message).toContain("3 active goals");
    expect(message).toContain("Pro (coming soon)");
    expect(limitReachedMessage("PRO", "activeExperiments")).not.toContain("coming soon");
  });

  it("keeps the last 30 days of Journey free", () => {
    expect(canUseJourneyRange("FREE", "30d")).toBe(true);
    expect(canUseJourneyRange("FREE", "1y")).toBe(false);
    expect(canUseJourneyRange("PRO", "all")).toBe(true);
  });

  it("parses tier names loosely", () => {
    expect(parsePlanTier(" pro ")).toBe("PRO");
    expect(parsePlanTier("Premium")).toBe("PREMIUM");
    expect(parsePlanTier("gold")).toBeNull();
  });

  it("only offers the free tier until payments launch", () => {
    expect(PLAN_TIERS.filter((tier) => PLANS[tier].available)).toEqual(["FREE"]);
  });
});
