import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { skillXpForLevel } from "@/modules/skills/levels";
import { db } from "@/server/db";
import { syncSkillCatalogue } from "@/server/db/skill-sync";

import * as social from "./social.service";

/**
 * The community against the real database, with real members on both sides:
 * a viewer, a visible mentor with a proven programming skill, and a member
 * who keeps their profile private. Nothing is shared until it's turned on,
 * private members are never named, and a mentorship only starts once the
 * other member accepts.
 */

const RUN = Date.now();
const handle = (name: string) => `integration-social-${name}-${RUN}`;
type TestUser = { id: string; timezone: string; displayName: string; handle: string };
let viewer: TestUser;
let mentor: TestUser;
let hidden: TestUser;

async function createUser(name: string, displayName: string): Promise<TestUser> {
  const created = await db.user.create({ data: { handle: handle(name), displayName, timezone: "UTC" } });
  return { id: created.id, timezone: "UTC", displayName, handle: created.handle };
}

beforeAll(async () => {
  await syncSkillCatalogue(db);
  [viewer, mentor, hidden] = await Promise.all([
    createUser("viewer", "Community Tester"),
    createUser("mentor", "Marcus Mentor"),
    createUser("hidden", "Private Person"),
  ]);
  await db.userInterest.createMany({
    data: [
      { userId: viewer.id, label: "Programming", slug: "programming" },
      { userId: viewer.id, label: "Running", slug: "running" },
      { userId: mentor.id, label: "Programming", slug: "programming" },
      { userId: hidden.id, label: "Programming", slug: "programming" },
    ],
  });

  // The mentor has taken a programming skill to level 4 — enough to mentor.
  const skill = await db.skill.findFirstOrThrow({ where: { tree: { slug: "programming" }, maxLevel: { gte: 4 } } });
  await db.skillXpTransaction.create({
    data: { userId: mentor.id, skillId: skill.id, amount: skillXpForLevel(skill.baseXp, 4), sourceType: "ADJUSTMENT", sourceId: `test-${RUN}`, reason: "test" },
  });
  await social.saveSocialProfile(mentor, {
    ...social.DEFAULT_SOCIAL_PROFILE,
    visibility: "COMMUNITY",
    headline: "Two years ahead of you",
    openToMentoring: true,
    onLeaderboards: true,
  });
  await social.joinGuild(mentor, "coding");
  await social.joinGuild(hidden, "coding");
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { in: [viewer.handle, mentor.handle, hidden.handle] } } });
  await db.$disconnect();
});

describe("community", () => {
  it("shares nothing until the user says so", async () => {
    const { viewer: card } = await social.getSocialProfile(viewer);
    expect(card.settings).toMatchObject({ visibility: "PRIVATE", onLeaderboards: false, openToMentoring: false });
    expect(card.guilds).toEqual([]);
  });

  it("finds visible members on shared interests, and never private ones or the viewer", async () => {
    const overview = await social.getCommunityOverview(viewer);
    const handles = overview.discovery.map((match) => match.subject.handle);
    expect(handles).toContain(mentor.handle);
    expect(handles).not.toContain(hidden.handle);
    expect(handles).not.toContain(viewer.handle);
    expect(overview.discovery.find((match) => match.subject.handle === mentor.handle)!.reasons.join(" ")).toContain("Programming");
    expect(overview.guilds.suggested.map((match) => match.subject.slug)).toContain("coding");

    expect(await social.getPerson(viewer, hidden.handle)).toBeNull();
    expect(await social.getPerson(viewer, viewer.handle)).toBeNull();
    const person = await social.getPerson(viewer, mentor.handle);
    expect(person!.person).toMatchObject({ headline: "Two years ahead of you", tier: "mentor", mentorsIn: ["programming"] });
    expect(person!.shared.interests).toEqual(["Programming"]);
  });

  it("counts every guild member but only names the visible ones", async () => {
    await social.joinGuild(viewer, "coding");
    const detail = await social.getGuildDetail(viewer, "coding");
    expect(detail).toMatchObject({ joined: true });
    expect(detail!.guild.memberCount).toBeGreaterThanOrEqual(3);
    const members = detail!.members.map((person) => person.handle);
    expect(members).toContain(mentor.handle);
    expect(members).not.toContain(hidden.handle);
    expect(members).not.toContain(viewer.handle);

    await social.leaveGuild(viewer, "coding");
    expect((await social.getGuilds(viewer)).joined).toEqual([]);
    await expect(social.joinGuild(viewer, "not-a-guild")).rejects.toThrow(/doesn't exist/);
  });

  it("starts a real personal challenge when joining a group, and leaves it running afterwards", async () => {
    await social.joinGroupChallenge(mentor, "coding-14-build");
    await social.joinGroupChallenge(viewer, "coding-14-build");

    const challenge = await db.challenge.findFirst({ where: { userId: viewer.id } });
    expect(challenge).toMatchObject({ templateKey: "coding-14", status: "ACTIVE" });

    const view = (await social.getGroupChallenges(viewer)).find((entry) => entry.challenge.key === "coding-14-build")!;
    expect(view.you).toMatchObject({ joined: true, daysDone: 0 });
    expect(view.participants.map((entry) => entry.person.handle)).toContain(mentor.handle);
    expect(view.participants.map((entry) => entry.person.handle)).not.toContain(viewer.handle);

    await expect(social.joinGroupChallenge(viewer, "coding-14-build")).rejects.toThrow(/already in this one/);

    await social.leaveGroupChallenge(viewer, "coding-14-build");
    expect((await db.challenge.findFirst({ where: { userId: viewer.id } }))!.status).toBe("ACTIVE");
    expect((await social.getGroupChallenges(viewer)).find((entry) => entry.challenge.key === "coding-14-build")!.you.joined).toBe(false);
  });

  it("asks for mentorship, waits for the other member, and only then opens notes", async () => {
    await social.requestMentorship(viewer, { handle: mentor.handle, role: "MENTEE", topic: "Programming", message: "Stuck on projects." });

    const [mine] = await social.getMentorships(viewer);
    expect(mine).toMatchObject({ role: "MENTEE", status: "PENDING", direction: "outgoing", topic: "Programming" });
    expect(mine.counterpart.displayName).toBe("Marcus Mentor");

    // The mentor sees it from their side: asked to mentor, waiting on them.
    const theirs = await social.getMentorshipHub(mentor);
    expect(theirs.incoming).toHaveLength(1);
    expect(theirs.incoming[0]).toMatchObject({ role: "MENTOR", direction: "incoming", message: "Stuck on projects." });

    await expect(social.requestMentorship(viewer, { handle: mentor.handle, role: "MENTEE", topic: "Again", message: null })).rejects.toThrow(
      /already have a mentorship or a request open/,
    );
    await expect(social.requestMentorship(viewer, { handle: hidden.handle, role: "MENTEE", topic: "X", message: null })).rejects.toThrow(
      /isn't in the community/,
    );
    // Only the asked member can answer, and notes wait for an answer.
    await expect(social.respondToMentorship(viewer, mine.id, true)).rejects.toThrow(/doesn't exist/);
    await expect(social.sendMentorshipMessage(viewer, mine.id, "Hello?")).rejects.toThrow(/closed/);
    expect(await social.getMentorshipThread(viewer, mine.id)).toBeNull();

    await social.respondToMentorship(mentor, mine.id, true);
    await social.sendMentorshipMessage(viewer, mine.id, "Here's where I am.");
    await social.sendMentorshipMessage(mentor, mine.id, "Thanks — let's pick one small project.");

    const thread = await social.getMentorshipThread(viewer, mine.id);
    expect(thread!.canWrite).toBe(true);
    expect(thread!.messages.map((message) => [message.mine, message.body])).toEqual([
      [true, "Here's where I am."],
      [false, "Thanks — let's pick one small project."],
    ]);
    expect(await social.getMentorshipThread(hidden, mine.id)).toBeNull();

    const person = await social.getPerson(viewer, mentor.handle);
    expect(person!.mentorship).toMatchObject({ status: "ACTIVE" });
    expect((await social.getMentorshipHub(viewer)).mentors.map((match) => match.person.handle)).not.toContain(mentor.handle);

    await social.endMentorship(mentor, mine.id);
    expect((await social.getMentorships(viewer))[0].status).toBe("ENDED");
    await expect(social.sendMentorshipMessage(viewer, mine.id, "One more")).rejects.toThrow(/closed/);
  });

  it("keeps the user off leaderboards until they opt in", async () => {
    const before = await social.getLeaderboards(viewer, "xp", null);
    expect(before.rows.some((row) => row.isViewer)).toBe(false);
    expect(before.rows.some((row) => row.handle === mentor.handle)).toBe(true);
    expect(before.rows.some((row) => row.handle === hidden.handle)).toBe(false);
    expect(before.comparison.length).toBeGreaterThan(0);

    await social.saveSocialProfile(viewer, { ...social.DEFAULT_SOCIAL_PROFILE, visibility: "COMMUNITY", onLeaderboards: true });
    const after = await social.getLeaderboards(viewer, "xp", null);
    expect(after.rows.filter((row) => row.isViewer)).toHaveLength(1);
    expect(after.rows.filter((row) => row.handle === viewer.handle)).toHaveLength(1);
    expect(after.onLeaderboards).toBe(true);

    // A guild board only includes the user where they're actually a member.
    const guildBoard = await social.getLeaderboards(viewer, "xp", "fitness");
    expect(guildBoard.rows.some((row) => row.isViewer)).toBe(false);
  });
});
