import { describe, expect, it } from "vitest";

import { CHALLENGE_TEMPLATES } from "@/modules/challenges/catalogue";
import { SKILL_TREES } from "@/modules/skills/catalogue";

import { seededDirectory } from "./directory";
import { GROUP_CHALLENGES, GUILDS } from "./guilds";
import { buildBoard, compareToPreviousSelf, MIN_IMPROVEMENT_BASELINE, resolveMetric, type BoardSubject } from "./leaderboards";
import { discoverPeople, rankGuilds, rankPeople, sharedInterests, type ViewerContext } from "./matching";
import { canMentorIn, findMentees, findMentors, mentorshipChains, startingPlan, viewerTier } from "./mentorship";
import { PEOPLE } from "./people";

const viewer = (overrides: Partial<ViewerContext> = {}): ViewerContext => ({
  interests: [],
  focusAreas: [],
  goalAreas: [],
  skillTrees: [],
  guilds: [],
  ...overrides,
});

describe("seeded community data", () => {
  const handles = new Set(PEOPLE.map((person) => person.handle));
  const guildSlugs = new Set(GUILDS.map((guild) => guild.slug));
  const treeSlugs = new Set(SKILL_TREES.map((tree) => tree.slug));

  it("only references guilds and skill trees that exist", () => {
    for (const person of PEOPLE) {
      for (const slug of person.guilds) expect(guildSlugs, `${person.handle} guild ${slug}`).toContain(slug);
      for (const skill of person.skills) expect(treeSlugs, `${person.handle} skill ${skill.treeSlug}`).toContain(skill.treeSlug);
      for (const tree of [...person.mentorsIn, ...person.seekingMentorIn]) expect(treeSlugs).toContain(tree);
    }
    for (const guild of GUILDS) if (guild.skillTree) expect(treeSlugs).toContain(guild.skillTree);
  });

  it("keeps mentoring relationships pointing both ways", () => {
    for (const person of PEOPLE) {
      for (const menteeHandle of person.mentoring) {
        const mentee = PEOPLE.find((candidate) => candidate.handle === menteeHandle);
        expect(mentee, `${person.handle} mentors unknown ${menteeHandle}`).toBeDefined();
        expect(mentee!.mentoredBy).toContain(person.handle);
      }
      for (const mentorHandle of person.mentoredBy) {
        expect(handles).toContain(mentorHandle);
        expect(PEOPLE.find((candidate) => candidate.handle === mentorHandle)!.mentoring).toContain(person.handle);
      }
    }
  });

  it("builds group challenges on real templates, guilds and members", () => {
    const templateKeys = new Set(CHALLENGE_TEMPLATES.map((template) => template.key));
    for (const challenge of GROUP_CHALLENGES) {
      expect(templateKeys, challenge.key).toContain(challenge.templateKey);
      expect(guildSlugs).toContain(challenge.guildSlug);
      expect(challenge.targetDays).toBeLessThanOrEqual(challenge.durationDays);
      expect(challenge.startedDaysAgo).toBeLessThan(challenge.durationDays);
      for (const participant of challenge.participants) {
        expect(handles, `${challenge.key} participant`).toContain(participant.handle);
        expect(participant.daysDone).toBeLessThanOrEqual(challenge.startedDaysAgo + 1);
      }
    }
  });

  it("serves everything through the directory, labelled as seeded", () => {
    expect(seededDirectory.kind).toBe("seeded");
    expect(seededDirectory.guildMembers("coding").length).toBeGreaterThan(0);
    expect(seededDirectory.guildChallenges("fitness").map((challenge) => challenge.key)).toEqual(["fitness-30-autumn"]);
    expect(seededDirectory.findPerson("nobody")).toBeUndefined();
  });
});

describe("shared ground", () => {
  it("matches interests however they're written", () => {
    expect(sharedInterests(["Strength Training", "cooking"], ["strength-training", "Photography"])).toEqual(["Strength Training"]);
  });

  it("ranks people by what's actually shared, and says why", () => {
    const matches = rankPeople(viewer({ interests: ["Programming", "Running"], guilds: ["coding"], skillTrees: ["programming"] }), PEOPLE);
    expect(matches[0].subject.handle).toBe("priya-s");
    expect(matches[0].reasons[0]).toBe("You both like Programming and Running");
    expect(matches.every((match) => match.reasons.length > 0)).toBe(true);
  });

  it("still shows people to someone who has told AROHA nothing", () => {
    const matches = discoverPeople(viewer(), PEOPLE, 6);
    expect(matches).toHaveLength(6);
    expect(matches[0].reasons[0]).toContain("add interests");
  });

  it("suggests guilds from interests, focus and skills", () => {
    const ranked = rankGuilds(viewer({ interests: ["Meditation"], focusAreas: ["MENTAL"] }), GUILDS);
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
    expect(matches[0].person.handle).toBe("marcus-b");
    expect(matches[0].reasons).toContain("A couple of years ahead of you, not ten — usually the more useful gap");
    expect(matches.map((match) => match.person.handle)).toContain("priya-s");
  });

  it("only offers mentees in skills the viewer has actually built, and never someone already mentored", () => {
    expect(findMentees(PEOPLE, [])).toEqual([]);
    const matches = findMentees(PEOPLE, ["programming"]);
    expect(matches.map((match) => match.person.handle)).toEqual(["dev-p"]);
    expect(matches.map((match) => match.person.handle)).not.toContain("aiko-m");
  });

  it("derives expert → mentor → beginner chains from who mentors whom", () => {
    const chains = mentorshipChains(PEOPLE);
    expect(chains.map((chain) => [chain.expert.handle, chain.mentor.handle, chain.beginner.handle])).toEqual([
      ["priya-s", "marcus-b", "aiko-m"],
      ["kenji-t", "sofia-l", "leila-h"],
    ]);
  });

  it("gives each side its own starting plan", () => {
    expect(startingPlan("Programming", "MENTEE")[0]).toContain("where you are with Programming");
    expect(startingPlan("Programming", "MENTOR")[0]).toContain("what they've already tried");
  });
});
