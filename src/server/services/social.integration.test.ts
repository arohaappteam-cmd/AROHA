import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";

import * as social from "./social.service";

/**
 * Phase 11 against the real database: the community layer is a demonstration,
 * but the user's own side of it is real — guilds joined, group challenges that
 * start an ordinary personal challenge, mentorships recorded, and sharing that
 * stays off until it's turned on.
 */

const HANDLE = `integration-social-${Date.now()}`;
type TestUser = { id: string; timezone: string; displayName: string };
let user: TestUser;

beforeAll(async () => {
  const created = await db.user.create({ data: { handle: HANDLE, displayName: "Community Tester", timezone: "UTC" } });
  user = { id: created.id, timezone: "UTC", displayName: created.displayName };
  await db.userInterest.createMany({
    data: [
      { userId: user.id, label: "Programming", slug: "programming" },
      { userId: user.id, label: "Running", slug: "running" },
    ],
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: HANDLE } });
  await db.$disconnect();
});

describe("community", () => {
  it("shares nothing until the user says so", async () => {
    const { viewer } = await social.getSocialProfile(user);
    expect(viewer.settings).toMatchObject({ visibility: "PRIVATE", onLeaderboards: false, openToMentoring: false });
    expect(viewer.guilds).toEqual([]);
  });

  it("matches people and guilds on the user's real interests", async () => {
    const overview = await social.getCommunityOverview(user);
    expect(overview.directoryKind).toBe("seeded");
    expect(overview.discovery[0].reasons.join(" ")).toContain("Programming");
    expect(overview.guilds.suggested.map((match) => match.subject.slug)).toContain("coding");
  });

  it("joins and leaves a guild", async () => {
    await social.joinGuild(user, "coding");
    expect((await social.getGuilds(user)).joined.map((card) => card.guild.slug)).toEqual(["coding"]);
    const detail = await social.getGuildDetail(user, "coding");
    expect(detail).toMatchObject({ joined: true });
    expect(detail!.members.length).toBeGreaterThan(0);

    await social.leaveGuild(user, "coding");
    expect((await social.getGuilds(user)).joined).toEqual([]);
    await expect(social.joinGuild(user, "not-a-guild")).rejects.toThrow(/doesn't exist/);
  });

  it("starts a real personal challenge when joining a group, and leaves it running afterwards", async () => {
    await social.joinGroupChallenge(user, "coding-14-build");

    const challenge = await db.challenge.findFirst({ where: { userId: user.id } });
    expect(challenge).toMatchObject({ templateKey: "coding-14", status: "ACTIVE" });

    const views = await social.getGroupChallenges(user);
    const joined = views.find((view) => view.challenge.key === "coding-14-build")!;
    expect(joined.you).toMatchObject({ joined: true, daysDone: 0 });
    expect(joined.participants.length).toBeGreaterThan(0);
    // Other people's progress is seeded, and sorted by days done.
    expect(joined.participants[0].daysDone).toBeGreaterThanOrEqual(joined.participants.at(-1)!.daysDone);

    await expect(social.joinGroupChallenge(user, "coding-14-build")).rejects.toThrow(/already in this one/);

    await social.leaveGroupChallenge(user, "coding-14-build");
    expect((await db.challenge.findFirst({ where: { userId: user.id } }))!.status).toBe("ACTIVE");
    expect((await social.getGroupChallenges(user)).find((view) => view.challenge.key === "coding-14-build")!.you.joined).toBe(false);
  });

  it("records a mentorship with a starting plan, and refuses a duplicate", async () => {
    await social.requestMentorship(user, { handle: "marcus-b", role: "MENTEE", topic: "Programming", message: "Stuck on projects." });

    const [mentorship] = await social.getMentorships(user);
    expect(mentorship).toMatchObject({ role: "MENTEE", status: "ACTIVE", topic: "Programming" });
    expect(mentorship.person?.displayName).toBe("Marcus B.");
    expect(mentorship.plan.length).toBeGreaterThan(0);

    await expect(
      social.requestMentorship(user, { handle: "marcus-b", role: "MENTEE", topic: "Programming", message: null }),
    ).rejects.toThrow(/already have a mentorship/);
    await expect(
      social.requestMentorship(user, { handle: "aiko-m", role: "MENTEE", topic: "Programming", message: null }),
    ).rejects.toThrow(/isn't taking on anyone/);

    const hub = await social.getMentorshipHub(user);
    expect(hub.mentors.map((match) => match.person.handle)).not.toContain("marcus-b");
    expect(hub.chains.length).toBeGreaterThan(0);

    await social.endMentorship(user, mentorship.id);
    expect((await social.getMentorships(user))[0].status).toBe("ENDED");
  });

  it("keeps the user off leaderboards until they opt in", async () => {
    const before = await social.getLeaderboards(user, "xp", null);
    expect(before.rows.some((row) => row.isViewer)).toBe(false);
    expect(before.comparison.length).toBeGreaterThan(0);

    await social.saveSocialProfile(user, { ...social.DEFAULT_SOCIAL_PROFILE, visibility: "COMMUNITY", onLeaderboards: true });
    const after = await social.getLeaderboards(user, "xp", null);
    expect(after.rows.some((row) => row.isViewer)).toBe(true);
    expect(after.onLeaderboards).toBe(true);

    // A guild board only includes the user where they're actually a member.
    const guildBoard = await social.getLeaderboards(user, "xp", "fitness");
    expect(guildBoard.rows.some((row) => row.isViewer)).toBe(false);
  });

  it("shows a member's profile with the ground they share", async () => {
    const view = await social.getPerson(user, "priya-s");
    expect(view!.person.displayName).toBe("Priya S.");
    expect(view!.shared.interests).toEqual(["Programming", "Running"]);
    expect(view!.mentoring.map((person) => person.handle)).toEqual(["marcus-b"]);
    expect(await social.getPerson(user, "nobody")).toBeNull();
  });
});
