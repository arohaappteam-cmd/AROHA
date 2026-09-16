import { describe, expect, it } from "vitest";

import { bestActiveStreak, completionQualifies, computeStreak, computeStreaks, STREAK_DEFINITIONS } from "./streaks";

const READING = STREAK_DEFINITIONS.find((d) => d.key === "reading")!;
const EXERCISE = STREAK_DEFINITIONS.find((d) => d.key === "exercise")!;
const SHOWING_UP = STREAK_DEFINITIONS.find((d) => d.key === "showing-up")!;

describe("streak qualification", () => {
  it("matches by template key, life area, or everything", () => {
    expect(completionQualifies(READING, { lifeArea: "LEARNING", templateKey: "learning.reading" })).toBe(true);
    expect(completionQualifies(READING, { lifeArea: "LEARNING", templateKey: "learning.video" })).toBe(false);
    expect(completionQualifies(EXERCISE, { lifeArea: "PHYSICAL", templateKey: "physical.run" })).toBe(true);
    expect(completionQualifies(EXERCISE, { lifeArea: "MENTAL", templateKey: "mental.journal" })).toBe(false);
    expect(completionQualifies(SHOWING_UP, { lifeArea: "SOCIAL", templateKey: "social.call" })).toBe(true);
  });
});

describe("computeStreak", () => {
  const days = (...dates: string[]) => new Set(dates);

  it("counts a run that reaches today, and knows today is earned", () => {
    const streak = computeStreak(READING, days("2026-09-14", "2026-09-15", "2026-09-16"), "2026-09-16");
    expect(streak).toMatchObject({ current: 3, activeToday: true, longest: 3, lifetimeDays: 3 });
  });

  it("keeps the run alive when today simply hasn't happened yet", () => {
    const streak = computeStreak(READING, days("2026-09-14", "2026-09-15"), "2026-09-16");
    expect(streak).toMatchObject({ current: 2, activeToday: false });
  });

  it("ends the current run after a missed day — but longest and lifetime survive", () => {
    const streak = computeStreak(READING, days("2026-09-10", "2026-09-11", "2026-09-12", "2026-09-14"), "2026-09-16");
    expect(streak.current).toBe(0); // last activity two days ago
    expect(streak.longest).toBe(3); // the 10–12 run is kept forever
    expect(streak.lifetimeDays).toBe(4); // every day still counts
  });

  it("restarts cleanly after a gap", () => {
    const streak = computeStreak(READING, days("2026-09-01", "2026-09-02", "2026-09-15", "2026-09-16"), "2026-09-16");
    expect(streak).toMatchObject({ current: 2, longest: 2, lifetimeDays: 4 });
  });

  it("handles no history at all", () => {
    const streak = computeStreak(READING, days(), "2026-09-16");
    expect(streak).toMatchObject({ current: 0, longest: 0, lifetimeDays: 0, lastDate: null, activeToday: false });
  });
});

describe("computeStreaks and bestActiveStreak", () => {
  it("splits one history into the right streaks", () => {
    const completions = [
      { date: "2026-09-15", lifeArea: "PHYSICAL" as const, templateKey: "physical.run" },
      { date: "2026-09-16", lifeArea: "PHYSICAL" as const, templateKey: "physical.walk" },
      { date: "2026-09-16", lifeArea: "LEARNING" as const, templateKey: "learning.reading" },
    ];
    const streaks = computeStreaks(completions, "2026-09-16");
    const byKey = new Map(streaks.map((streak) => [streak.key, streak]));
    expect(byKey.get("exercise")).toMatchObject({ current: 2 });
    expect(byKey.get("reading")).toMatchObject({ current: 1 });
    expect(byKey.get("meditation")).toMatchObject({ current: 0 });
    expect(byKey.get("showing-up")).toMatchObject({ current: 2, lifetimeDays: 2 });

    expect(bestActiveStreak(streaks)!.key).toBe("showing-up");
    expect(bestActiveStreak(computeStreaks([], "2026-09-16"))).toBeNull();
  });
});
