import { describe, expect, it } from "vitest";

import { CHALLENGE_TEMPLATES } from "@/modules/challenges/catalogue";
import { SKILL_TREES } from "@/modules/skills/catalogue";

import { GROUP_CHALLENGES, GUILDS } from "./guilds";
import { buildBoard, compareToPreviousSelf, MIN_IMPROVEMENT_BASELINE, resolveMetric, type BoardSubject } from "./leaderboards";
import { discoverPeople, rankGuilds, rankPeople, sharedInterests, type ViewerContext } from "./matching";
import { canMentorIn, findMentees, findMentors, mentorshipChains, startingPlan, viewerTier } from "./mentorship";
import type { Guild, SocialPerson } from "./types";

const viewer = (overrides: Partial<ViewerContext> = {}): ViewerContext => ({
  interests: [],
  focusAreas: [],
  goalAreas: [],
  skillTrees: [],
  guilds: [],
  ...overrides,
});

/** A visible member, with only what a test cares about filled in. */
const member = (handle: string, overrides: Partial<SocialPerson> = {}): SocialPerson => ({
  handle,
  displayName: handle,
  pronouns: null,
  avatar: { style: "ORB", color: "violet", emblem: "sprout" },
  headline: "",
  about: "",
  note: "",
  joinedDaysAgo: 30,
  progress: null,
  record: null,
  interests: [],
  focusAreas: [],
  skills: [],
  guilds: [],
  tier: "beginner",
  mentorsIn: [],
  openToMentoring: false,
  seekingMentorIn: [],
  mentoredBy: [],
  mentoring: [],
  ...overrides,
});

// A small community: one programming chain (priya → marcus → aiko), a
// beginner still looking for help (dev), and someone with nothing in common.
const PEOPLE: SocialPerson[] = [
  member("priya", {
    interests: ["Programming", "Running", "Science"],
    focusAreas: ["LEARNING", "CAREER"],
    guilds: ["coding", "fitness"],
    tier: "expert",
    mentorsIn: ["programming"],
    openToMentoring: true,
    mentoring: ["marcus"],
  }),
  member("marcus", {
    interests: ["Programming", "Board games"],
    focusAreas: ["LEARNING"],
    guilds: ["coding"],
    tier: "mentor",
    mentorsIn: ["programming"],
    openToMentoring: true,
    mentoredBy: ["priya"],
    mentoring: ["aiko"],
  }),
  member("aiko", { interests: ["Programming"], guilds: ["coding"], seekingMentorIn: ["programming"], mentoredBy: ["marcus"] }),
  member("dev", { interests: ["Programming"], seekingMentorIn: ["programming"], joinedDaysAgo: 12 }),
  member("nadia", { interests: ["Meditation"], focusAreas: ["MENTAL"], guilds: ["mindfulness"] }),
  member("tomas", { interests: ["History"] }),
  member("ada", { interests: ["Philosophy"] }),
];

const GUILD_LIST: Guild[] = GUILDS.map((guild) => ({ ...guild, memberCount: 0 }));

describe("community catalogue", () => {
  const treeSlugs = new Set(SKILL_TREES.map((tree) => tree.slug));
  const guildSlugs = new Set(GUILDS.map((guild) => guild.slug));

  it("only references skill trees that exist", () => {
    for (const guild of GUILDS) if (guild.skillTree) expect(treeSlugs).toContain(guild.skillTree);
  });

  it("builds group challenges on real templates and guilds", () => {
    const templateKeys = new Set(CHALLENGE_TEMPLATES.map((template) => template.key));
    for (const challenge of GROUP_CHALLENGES) {
      expect(templateKeys, challenge.key).toContain(challenge.templateKey);
      expect(guildSlugs).toContain(challenge.guildSlug);
      expect(challenge.targetDays).toBeLessThanOrEqual(challenge.durationDays);
    }
  });
});

describe("shared ground", () => {
  it("matches interests however they're written", () => {
    expect(sharedInterests(["Strength Training", "cooking"], ["strength-training", "Photography"])).toEqual(["Strength Training"]);
  });

  it("ranks people by what's actually shared, and says why", () => {
    const matches = rankPeople(viewer({ interests: ["Programming", "Running"], guilds: ["coding"], skillTrees: ["programming"] }), PEOPLE);
    expect(matches[0].subject.handle).toBe("priya");
    expect(matches[0].reasons[0]).toBe("You both like Programming and Running");
    expect(matches.every((match) => match.reasons.length > 0)).toBe(true);
    expect(matches.map((match) => match.subject.handle)).not.toContain("tomas");
  });

  it("still shows people to someone who has told AROHA nothing", () => {
    const matches = discoverPeople(viewer(), PEOPLE, 6);
    expect(matches).toHaveLength(6);
    expect(matches[0].reasons[0]).toContain("add interests");
  });

  it("returns nobody when nobody is visible", () => {
    expect(discoverPeople(viewer({ interests: ["Programming"] }), [], 6)).toEqual([]);
  });

  it("suggests guilds from interests, focus and skills", () => {
    const ranked = rankGuilds(viewer({ interests: ["Meditation"], focusAreas: ["MENTAL"] }), GUILD_LIST);
    expect(ranked[0].subject.slug).toBe("mindfulness");
    expect(ranked[0].reasons).toContain("Mental is one of your focus areas");
  });
});

describe("leaderboards", () => {
  const subject = (name: string, overrides: Partial<BoardSubject> = {}): BoardSubject => ({
    handle: name,
    name,
    isViewer: false,
    xpRecent: 100,
    xpPrevious: 100,
    challengesCompleted: 1,
    achievements: 1,
    ...overrides,
  });

  it("opens no board unless one is asked for", () => {
    expect(resolveMetric(undefined)).toBeNull();
    expect(resolveMetric("nonsense")).toBeNull();
    expect(resolveMetric("progress")).toBe("progress");
  });

  it("shares a rank on a tie", () => {
    const rows = buildBoard([subject("A", { xpRecent: 500 }), subject("B", { xpRecent: 500 }), subject("C", { xpRecent: 10 })], "xp");
    expect(rows.map((row) => [row.name, row.rank, row.display])).toEqual([
      ["A", 1, "500"],
      ["B", 1, "500"],
      ["C", 3, "10"],
    ]);
  });

  it("leaves out anyone whose baseline is too small to call improvement", () => {
    const rows = buildBoard(
      [subject("Steady", { xpRecent: 300, xpPrevious: 200 }), subject("Tiny", { xpRecent: 60, xpPrevious: MIN_IMPROVEMENT_BASELINE - 1 })],
      "progress",
    );
    expect(rows.map((row) => row.name)).toEqual(["Steady"]);
    expect(rows[0].display).toBe("+50%");
  });

  it("always keeps the viewer's own row in view", () => {
    const others = Array.from({ length: 12 }, (_, index) => subject(`P${index}`, { xpRecent: 1000 + index }));
    const rows = buildBoard([...others, subject("You", { isViewer: true, xpRecent: 5 })], "xp", 10);
    expect(rows).toHaveLength(11);
    expect(rows.at(-1)).toMatchObject({ name: "You", isViewer: true, rank: 13 });
  });

  it("describes a change against your own previous period in plain words", () => {
    const [up, flat, fresh] = compareToPreviousSelf([
      { key: "xp", label: "XP", current: 120, previous: 100, unit: "XP" },
      { key: "quests", label: "Quests", current: 8, previous: 8, unit: "quests" },
      { key: "skills", label: "Skills", current: 2, previous: 0, unit: "levels" },
    ]);
    expect(up).toMatchObject({ change: 20, percent: 20, summary: "20 XP more than the 28 days before" });
    expect(flat.summary).toBe("Exactly the same as the 28 days before");
    expect(fresh).toMatchObject({ percent: null, summary: "New ground — nothing in the 28 days before" });
  });
});

describe("mentorship", () => {
  it("reads the viewer's standing from the skills they've built", () => {
    expect(viewerTier([])).toBe("beginner");
    expect(viewerTier([{ treeSlug: "programming", level: 2 }])).toBe("beginner");
    expect(viewerTier([{ treeSlug: "programming", level: 4 }])).toBe("mentor");
    expect(viewerTier([{ treeSlug: "programming", level: 8 }])).toBe("expert");
    expect(canMentorIn([{ treeSlug: "programming", level: 4 }, { treeSlug: "music", level: 1 }])).toEqual(["programming"]);
  });

  it("prefers a near-peer over a distant expert for a beginner", () => {
    const matches = findMentors(viewer({ skillTrees: ["programming"], interests: ["Programming"] }), PEOPLE, "beginner");
    expect(matches[0].person.handle).toBe("marcus");
    expect(matches[0].reasons).toContain("A couple of years ahead of you, not ten — usually the more useful gap");
    expect(matches.map((match) => match.person.handle)).toContain("priya");
  });

  it("only offers mentees in skills the viewer has actually built, and never someone already mentored", () => {
    expect(findMentees(PEOPLE, [])).toEqual([]);
    const matches = findMentees(PEOPLE, ["programming"]);
    expect(matches.map((match) => match.person.handle)).toEqual(["dev"]);
    expect(matches[0].reasons[1]).toContain("12 days in");
  });

  it("derives expert → mentor → beginner chains from who mentors whom", () => {
    const chains = mentorshipChains(PEOPLE);
    expect(chains.map((chain) => [chain.expert.handle, chain.mentor.handle, chain.beginner.handle])).toEqual([["priya", "marcus", "aiko"]]);
  });

  it("gives each side its own starting plan", () => {
    expect(startingPlan("Programming", "MENTEE")[0]).toContain("where you are with Programming");
    expect(startingPlan("Programming", "MENTOR")[0]).toContain("what they've already tried");
  });
});
