import { describe, expect, it } from "vitest";

import { characterLevelEvents, filterTimeline, groupTimeline, skillMilestoneEvents, type TimelineEvent } from "./timeline";

const at = (iso: string) => new Date(iso);

describe("skill milestones", () => {
  const skills = [{ id: "s1", name: "Python", baseXp: 50, maxLevel: 3, treeSlug: "programming", treeEmoji: "💻" }];

  it("marks starting a skill, level 3 and the top level — not every level", () => {
    const events = skillMilestoneEvents(
      [
        { skillId: "s1", amount: 60, createdAt: at("2026-01-02T10:00:00Z") }, // level 1
        { skillId: "s1", amount: 100, createdAt: at("2026-01-05T10:00:00Z") }, // level 2 (160)
        { skillId: "s1", amount: 200, createdAt: at("2026-02-01T10:00:00Z") }, // level 3 = top (360 ≥ 300)
      ],
      skills,
    );
    expect(events.map((e) => e.title)).toEqual(["Started Python", "Reached the top level of Python"]);
    expect(events[1]).toMatchObject({ major: true, date: at("2026-02-01T10:00:00Z") });
  });

  it("replays in date order, whatever order rows arrive in", () => {
    const events = skillMilestoneEvents(
      [
        { skillId: "s1", amount: 300, createdAt: at("2026-03-01T00:00:00Z") },
        { skillId: "s1", amount: 60, createdAt: at("2026-01-01T00:00:00Z") },
      ],
      skills,
    );
    expect(events[0]).toMatchObject({ title: "Started Python", date: at("2026-01-01T00:00:00Z") });
  });
});

describe("character levels", () => {
  it("records tier changes and every fifth level", () => {
    // Level 5 needs 800 XP, level 10 needs 2700 (Explorer).
    const events = characterLevelEvents([
      { amount: 500, createdAt: at("2026-01-01T00:00:00Z") },
      { amount: 400, createdAt: at("2026-02-01T00:00:00Z") },
      { amount: 2000, createdAt: at("2026-03-01T00:00:00Z") },
    ]);
    expect(events.map((e) => e.title)).toEqual(["Reached level 5", "Became Explorer"]);
    expect(events[1].major).toBe(true);
  });
});

describe("grouping", () => {
  const event = (id: string, iso: string, major = false): TimelineEvent => ({
    id,
    kind: id.startsWith("g") ? "goal" : "project",
    date: at(iso),
    title: id,
    detail: "",
    emoji: "•",
    major,
  });

  it("groups newest-first by year and month in the user's timezone, with yearly highlights", () => {
    const years = groupTimeline(
      [event("g1", "2026-01-10T12:00:00Z", true), event("p1", "2027-03-02T12:00:00Z"), event("p2", "2026-01-20T12:00:00Z")],
      "UTC",
    );
    expect(years.map((y) => y.year)).toEqual([2027, 2026]);
    expect(years[1].months[0]).toMatchObject({ key: "2026-01", label: "January" });
    expect(years[1].months[0].events.map((e) => e.id)).toEqual(["p2", "g1"]);
    expect(years[1].highlights.map((e) => e.id)).toEqual(["g1"]);
    expect(years[1].count).toBe(2);
  });

  it("uses the user's calendar, not the server's", () => {
    // 23:30 UTC on Dec 31 is already Jan 1 in Kolkata.
    const years = groupTimeline([event("g1", "2026-12-31T23:30:00Z")], "Asia/Kolkata");
    expect(years[0]).toMatchObject({ year: 2027 });
  });

  it("filters by kind", () => {
    const events = [event("g1", "2026-01-10T12:00:00Z"), event("p1", "2026-01-11T12:00:00Z")];
    expect(filterTimeline(events, new Set(["goal"])).map((e) => e.id)).toEqual(["g1"]);
    expect(filterTimeline(events, new Set())).toHaveLength(2);
  });
});
