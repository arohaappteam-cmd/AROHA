import "server-only";

import type { User } from "@/generated/prisma/client";
import type { LifeArea, MentorshipRole, MentorshipStatus } from "@/generated/prisma/enums";
import { buildAnalyticsDataset } from "@/server/services/analytics.service";
import { buildOverview } from "@/modules/analytics/overview";
import { toAppearance, type AvatarAppearance } from "@/modules/identity/avatar";
import { focusAreas as pickFocusAreas, resolveLifeAreas } from "@/modules/identity/life-areas";
import { getLevelProgress, tierForLevel, type TierTitle } from "@/modules/progression";
import type { SocialDirectory } from "@/modules/social/directory";
import {
  buildBoard,
  compareToPreviousSelf,
  type BoardSubject,
  type LeaderboardMetric,
  type SelfComparison,
} from "@/modules/social/leaderboards";
import {
  discoverPeople,
  rankGuilds,
  sharedInterests,
  type GuildMatch,
  type PersonMatch,
  type ViewerContext,
} from "@/modules/social/matching";
import {
  canMentorIn,
  findMentees,
  findMentors,
  mentorshipChains,
  startingPlan,
  viewerTier,
  type MenteeMatch,
  type MentorMatch,
  type MentorshipChain,
} from "@/modules/social/mentorship";
import { MAX_MENTORSHIP_NOTE, type MentorshipRequestInput, type SocialProfileInput } from "@/modules/social/schemas";
import type { GroupChallenge, Guild, MentorTier, SocialPerson } from "@/modules/social/types";
import { getCurrentUser } from "@/server/auth/current-user";
import { goalRepository } from "@/server/repositories/goal.repository";
import { identityRepository } from "@/server/repositories/identity.repository";
import { progressionRepository } from "@/server/repositories/progression.repository";
import { socialRepository } from "@/server/repositories/social.repository";
import { userRepository } from "@/server/repositories/user.repository";
import * as challenges from "@/server/services/challenge.service";
import { liveDirectory } from "@/server/services/community-directory";
import { getSkillsOverview } from "@/server/services/skill.service";

/**
 * The community layer (spec §44–46): real members, met through guilds, group
 * challenges and mentorship. There is no feed.
 *
 * Everyone the user meets comes from `SocialDirectory`, which only returns
 * members who made their profile visible, and only the parts they chose to
 * share. The viewer never appears in their own results.
 *
 * Nothing about the user is shared until they choose it: a social profile is
 * PRIVATE until changed, and leaderboards list nobody who hasn't opted in.
 */

type UserLike = Pick<User, "id" | "timezone" | "displayName" | "handle">;

export class SocialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialError";
  }
}

/** The live directory; tests may swap in their own. */
let directory: SocialDirectory = liveDirectory;

export function setSocialDirectory(next: SocialDirectory): void {
  directory = next;
}

export const DEFAULT_SOCIAL_PROFILE: SocialProfileInput = {
  visibility: "PRIVATE",
  headline: null,
  showLevel: true,
  showSkills: true,
  showAchievements: true,
  onLeaderboards: false,
  openToMentoring: false,
  seekingMentor: false,
};

// ─── The viewer ──────────────────────────────────────────────────────────────

export type ViewerSkill = { treeSlug: string; name: string; emoji: string; level: number; xp: number };

export type ViewerCard = {
  name: string;
  appearance: AvatarAppearance;
  level: number;
  tier: TierTitle;
  totalXp: number;
  headline: string | null;
  interests: string[];
  focusAreas: LifeArea[];
  skills: ViewerSkill[];
  guilds: string[];
  mentorTier: MentorTier;
  canMentorIn: string[];
  settings: SocialProfileInput;
};

export type Viewer = { card: ViewerCard; context: ViewerContext };

async function buildViewer(user: UserLike): Promise<Viewer> {
  const [character, interests, storedAreas, goals, skills, totalXp, profile, memberships] = await Promise.all([
    identityRepository.ensureCharacter(user.id),
    identityRepository.listInterests(user.id),
    identityRepository.listLifeAreas(user.id),
    goalRepository.list(user.id, "current"),
    getSkillsOverview(user.id),
    progressionRepository.getTotalXp(user.id),
    socialRepository.findProfile(user.id),
    socialRepository.listGuilds(user.id),
  ]);

  const settings: SocialProfileInput = profile
    ? {
        visibility: profile.visibility,
        headline: profile.headline,
        showLevel: profile.showLevel,
        showSkills: profile.showSkills,
        showAchievements: profile.showAchievements,
        onLeaderboards: profile.onLeaderboards,
        openToMentoring: profile.openToMentoring,
        seekingMentor: profile.seekingMentor,
      }
    : DEFAULT_SOCIAL_PROFILE;

  const areas = resolveLifeAreas(storedAreas);
  const focus = pickFocusAreas(areas).map((area) => area.key);
  const level = getLevelProgress(totalXp).level;
  const viewerSkills: ViewerSkill[] = skills.trees
    .filter((tree) => tree.summary.xp > 0)
    .map((tree) => ({ treeSlug: tree.slug, name: tree.name, emoji: tree.emoji, level: tree.frontier?.level ?? 1, xp: tree.summary.xp }))
    .sort((a, b) => b.xp - a.xp);
  const guilds = memberships.map((membership) => membership.guildSlug);

  return {
    card: {
      name: user.displayName,
      appearance: toAppearance(character),
      level,
      tier: tierForLevel(level),
      totalXp,
      headline: settings.headline,
      interests: interests.map((interest) => interest.label),
      focusAreas: focus,
      skills: viewerSkills,
      guilds,
      mentorTier: viewerTier(viewerSkills),
      canMentorIn: canMentorIn(viewerSkills),
      settings,
    },
    context: {
      interests: interests.map((interest) => interest.label),
      focusAreas: focus,
      goalAreas: [...new Set(goals.filter((goal) => goal.status === "ACTIVE").map((goal) => goal.lifeArea))],
      skillTrees: viewerSkills.map((skill) => skill.treeSlug),
      guilds,
    },
  };
}

/** Everyone visible except the viewer. */
async function othersThan(user: UserLike): Promise<SocialPerson[]> {
  return (await directory.listPeople()).filter((person) => person.handle !== user.handle);
}

async function guildsBySlug(slugs: readonly string[]): Promise<Guild[]> {
  const guilds = await Promise.all(slugs.map((slug) => directory.findGuild(slug)));
  return guilds.filter((guild): guild is Guild => guild !== undefined);
}

/** The user's own numbers, on the same windows the community members show. */
export type ViewerStats = {
  xpRecent: number;
  xpPrevious: number;
  questsRecent: number;
  questsPrevious: number;
  skillLevelsRecent: number;
  skillLevelsPrevious: number;
  missionsRecent: number;
  missionsPrevious: number;
  achievements: number;
  challengesCompleted: number;
};

export async function getViewerStats(user: UserLike): Promise<ViewerStats> {
  const [dataset, achievements, challengesCompleted] = await Promise.all([
    buildAnalyticsDataset(user, "4w"),
    progressionRepository.countAchievements(user.id),
    socialRepository.countCompletedChallenges(user.id),
  ]);
  const totals = buildOverview(dataset, "4w").totals;
  const total = (key: string) => totals.find((entry) => entry.key === key) ?? { value: 0, previous: 0 };

  return {
    xpRecent: total("xp").value,
    xpPrevious: total("xp").previous,
    questsRecent: total("quests").value,
    questsPrevious: total("quests").previous,
    skillLevelsRecent: total("skillLevels").value,
    skillLevelsPrevious: total("skillLevels").previous,
    missionsRecent: total("missions").value,
    missionsPrevious: total("missions").previous,
    achievements,
    challengesCompleted,
  };
}

export function selfComparison(stats: ViewerStats): SelfComparison[] {
  return compareToPreviousSelf([
    { key: "xp", label: "XP earned", current: stats.xpRecent, previous: stats.xpPrevious, unit: "XP" },
    { key: "quests", label: "Quests completed", current: stats.questsRecent, previous: stats.questsPrevious, unit: "quests" },
    { key: "skills", label: "Skill levels gained", current: stats.skillLevelsRecent, previous: stats.skillLevelsPrevious, unit: "levels" },
    { key: "missions", label: "Goal missions done", current: stats.missionsRecent, previous: stats.missionsPrevious, unit: "missions" },
  ]);
}

// ─── Group challenges ────────────────────────────────────────────────────────

export type GroupChallengeView = {
  challenge: GroupChallenge;
  guild: Guild;
  /** Visible members running it now; `others` counts the private ones. */
  participants: { person: SocialPerson; daysDone: number; percent: number }[];
  others: number;
  /** The user's own challenge, when they've joined. */
  you: { joined: true; daysDone: number; percent: number; status: string; challengeId: string | null } | { joined: false };
};

type GroupEntry = Awaited<ReturnType<typeof socialRepository.listGroupEntries>>[number];

const percentOf = (days: number, target: number) => Math.min(100, Math.round((days / target) * 100));

async function toGroupView(user: UserLike, challenge: GroupChallenge, entry: GroupEntry | undefined): Promise<GroupChallengeView> {
  const [guild, participants] = await Promise.all([
    directory.findGuild(challenge.guildSlug),
    directory.groupParticipants(challenge.key, user.handle),
  ]);
  const daysDone = entry?.challenge?.days.length ?? 0;

  return {
    challenge,
    guild: guild!,
    participants: participants.visible.map(({ person, daysDone: days }) => ({ person, daysDone: days, percent: percentOf(days, challenge.targetDays) })),
    others: participants.others,
    you: entry
      ? {
          joined: true,
          daysDone,
          percent: percentOf(daysDone, challenge.targetDays),
          status: entry.challenge?.status ?? "ENDED",
          challengeId: entry.challengeId,
        }
      : { joined: false },
  };
}

export async function getGroupChallenges(user: UserLike): Promise<GroupChallengeView[]> {
  const entries = await socialRepository.listGroupEntries(user.id);
  const byKey = new Map(entries.map((entry) => [entry.groupKey, entry]));
  const views = await Promise.all(directory.listGroupChallenges().map((challenge) => toGroupView(user, challenge, byKey.get(challenge.key))));
  const company = (view: GroupChallengeView) => view.participants.length + view.others;
  return views.sort((a, b) => Number(b.you.joined) - Number(a.you.joined) || company(b) - company(a));
}

// ─── Guilds ──────────────────────────────────────────────────────────────────

export type GuildCard = { guild: Guild; joined: boolean; members: SocialPerson[]; reasons: string[] };

export type GuildsView = {
  joined: GuildCard[];
  suggested: GuildMatch[];
  all: GuildCard[];
};

export async function getGuilds(user: UserLike): Promise<GuildsView> {
  const [{ context }, guilds] = await Promise.all([buildViewer(user), directory.listGuilds()]);
  const joinedSlugs = new Set(context.guilds);
  const ranked = rankGuilds(context, guilds);
  const cards = await Promise.all(
    ranked.map(
      async (match): Promise<GuildCard> => ({
        guild: match.subject,
        joined: joinedSlugs.has(match.subject.slug),
        members: (await directory.guildMembers(match.subject.slug)).filter((person) => person.handle !== user.handle).slice(0, 5),
        reasons: match.reasons,
      }),
    ),
  );

  return {
    joined: cards.filter((card) => card.joined),
    suggested: ranked.filter((match) => !joinedSlugs.has(match.subject.slug) && match.reasons.length > 0).slice(0, 3),
    all: cards.sort((a, b) => a.guild.name.localeCompare(b.guild.name)),
  };
}

export type GuildDetail = {
  guild: Guild;
  joined: boolean;
  /** Visible members other than the viewer. */
  members: SocialPerson[];
  mentors: SocialPerson[];
  challenges: GroupChallengeView[];
  /** Interests the viewer shares with the guild's subject matter. */
  shared: string[];
};

export async function getGuildDetail(user: UserLike, slug: string): Promise<GuildDetail | null> {
  const guild = await directory.findGuild(slug);
  if (!guild) return null;

  const [{ context }, entries, members] = await Promise.all([
    buildViewer(user),
    socialRepository.listGroupEntries(user.id),
    directory.guildMembers(slug),
  ]);
  const byKey = new Map(entries.map((entry) => [entry.groupKey, entry]));
  const others = members.filter((person) => person.handle !== user.handle);

  return {
    guild,
    joined: context.guilds.includes(slug),
    members: others,
    mentors: others.filter((person) => person.openToMentoring && person.mentorsIn.length > 0),
    challenges: await Promise.all(directory.guildChallenges(slug).map((challenge) => toGroupView(user, challenge, byKey.get(challenge.key)))),
    shared: sharedInterests(context.interests, guild.interests),
  };
}

// ─── Discovery and people ────────────────────────────────────────────────────

export type CommunityOverview = {
  viewer: ViewerCard;
  /** How many other members are visible right now. */
  visibleMembers: number;
  discovery: PersonMatch[];
  guilds: GuildsView;
  groupChallenges: GroupChallengeView[];
  mentorships: MentorshipView[];
  chain: MentorshipChain | null;
  comparison: SelfComparison[];
};

export async function getCommunityOverview(user: UserLike): Promise<CommunityOverview> {
  const [viewer, stats, guilds, groupChallenges, mentorships, people] = await Promise.all([
    buildViewer(user),
    getViewerStats(user),
    getGuilds(user),
    getGroupChallenges(user),
    getMentorships(user),
    othersThan(user),
  ]);

  return {
    viewer: viewer.card,
    visibleMembers: people.length,
    discovery: discoverPeople(viewer.context, people, 6),
    guilds,
    groupChallenges: groupChallenges.slice(0, 3),
    mentorships: mentorships.filter((entry) => entry.status === "ACTIVE" || entry.status === "PENDING"),
    chain: mentorshipChains(people)[0] ?? null,
    comparison: selfComparison(stats),
  };
}

export type PersonView = {
  person: SocialPerson;
  shared: { interests: string[]; guilds: Guild[]; focusAreas: LifeArea[] };
  guilds: Guild[];
  mentoredBy: SocialPerson[];
  mentoring: SocialPerson[];
  /** The viewer's open (pending or active) mentorship with this person, if any. */
  mentorship: MentorshipView | null;
  viewer: ViewerCard;
};

/** Null when there's no such visible member — or when it's the viewer themself. */
export async function getPerson(user: UserLike, handle: string): Promise<PersonView | null> {
  if (handle === user.handle) return null;
  const person = await directory.findPerson(handle);
  if (!person) return null;

  const [viewer, mentorships, people, guilds] = await Promise.all([
    buildViewer(user),
    getMentorships(user),
    directory.listPeople(),
    guildsBySlug(person.guilds),
  ]);
  const byHandle = new Map(people.map((entry) => [entry.handle, entry]));
  const resolve = (handles: string[]) => handles.flatMap((entry) => byHandle.get(entry) ?? []);

  return {
    person,
    shared: {
      interests: sharedInterests(viewer.context.interests, person.interests),
      guilds: guilds.filter((guild) => viewer.context.guilds.includes(guild.slug)),
      focusAreas: person.focusAreas.filter((area) => viewer.context.focusAreas.includes(area)),
    },
    guilds,
    mentoredBy: resolve(person.mentoredBy),
    mentoring: resolve(person.mentoring),
    mentorship:
      mentorships.find((entry) => entry.counterpart.handle === handle && (entry.status === "ACTIVE" || entry.status === "PENDING")) ?? null,
    viewer: viewer.card,
  };
}

// ─── Mentorship ──────────────────────────────────────────────────────────────

export type MentorshipView = {
  id: string;
  /** The viewer's side: MENTEE means the other member is their mentor. */
  role: MentorshipRole;
  status: MentorshipStatus;
  /** Whether the viewer asked, or was asked. */
  direction: "outgoing" | "incoming";
  topic: string;
  message: string | null;
  startedAt: Date;
  /** Always named; `person` is only set while they're visible in the community. */
  counterpart: { handle: string; displayName: string };
  person: SocialPerson | null;
  /** How to make it work — the same short guidance for everyone. */
  plan: string[];
};

type MentorshipRow = Awaited<ReturnType<typeof socialRepository.listMentorships>>[number];

const flipRole = (role: MentorshipRole): MentorshipRole => (role === "MENTEE" ? "MENTOR" : "MENTEE");

function toMentorshipView(user: UserLike, row: MentorshipRow, byHandle: Map<string, SocialPerson>): MentorshipView {
  const outgoing = row.userId === user.id;
  const other = outgoing ? row.counterpart : row.user;
  const role = outgoing ? row.role : flipRole(row.role);
  return {
    id: row.id,
    role,
    status: row.status,
    direction: outgoing ? "outgoing" : "incoming",
    topic: row.topic,
    message: row.message,
    startedAt: row.startedAt,
    counterpart: other ? { handle: other.handle, displayName: other.displayName } : { handle: row.counterpartHandle, displayName: "A former member" },
    person: other ? (byHandle.get(other.handle) ?? null) : null,
    plan: startingPlan(row.topic, role),
  };
}

const STATUS_ORDER: Record<MentorshipStatus, number> = { PENDING: 0, ACTIVE: 1, DECLINED: 2, ENDED: 3 };

export async function getMentorships(user: UserLike): Promise<MentorshipView[]> {
  const [rows, people] = await Promise.all([socialRepository.listMentorships(user.id), directory.listPeople()]);
  const byHandle = new Map(people.map((person) => [person.handle, person]));
  return rows
    .map((row) => toMentorshipView(user, row, byHandle))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.startedAt.getTime() - a.startedAt.getTime());
}

export type MentorshipHub = {
  viewer: ViewerCard;
  /** Requests other members sent the viewer, waiting on an answer. */
  incoming: MentorshipView[];
  /** The viewer's own requests, waiting on the other member. */
  outgoing: MentorshipView[];
  active: MentorshipView[];
  past: MentorshipView[];
  mentors: MentorMatch[];
  mentees: MenteeMatch[];
  chains: MentorshipChain[];
};

export async function getMentorshipHub(user: UserLike): Promise<MentorshipHub> {
  const [viewer, mentorships, people] = await Promise.all([buildViewer(user), getMentorships(user), othersThan(user)]);
  const engaged = new Set(
    mentorships.filter((entry) => entry.status === "ACTIVE" || entry.status === "PENDING").map((entry) => entry.counterpart.handle),
  );

  return {
    viewer: viewer.card,
    incoming: mentorships.filter((entry) => entry.status === "PENDING" && entry.direction === "incoming"),
    outgoing: mentorships.filter((entry) => entry.status === "PENDING" && entry.direction === "outgoing"),
    active: mentorships.filter((entry) => entry.status === "ACTIVE"),
    past: mentorships.filter((entry) => entry.status === "ENDED" || entry.status === "DECLINED"),
    mentors: findMentors(viewer.context, people, viewer.card.mentorTier)
      .filter((match) => !engaged.has(match.person.handle))
      .slice(0, 4),
    mentees: findMentees(people, viewer.card.canMentorIn)
      .filter((match) => !engaged.has(match.person.handle))
      .slice(0, 3),
    chains: mentorshipChains(people).slice(0, 2),
  };
}

export type MentorshipThread = {
  mentorship: MentorshipView;
  messages: { id: string; body: string; createdAt: Date; mine: boolean }[];
  /** Notes can be sent only while the mentorship is active. */
  canWrite: boolean;
};

/** Only the two members of an accepted mentorship can read its notes. */
export async function getMentorshipThread(user: UserLike, mentorshipId: string): Promise<MentorshipThread | null> {
  const row = await socialRepository.findMentorshipForMember(user.id, mentorshipId);
  if (!row || row.status === "PENDING" || row.status === "DECLINED") return null;

  const [messages, people] = await Promise.all([socialRepository.listMessages(row.id), directory.listPeople()]);
  const byHandle = new Map(people.map((person) => [person.handle, person]));
  return {
    mentorship: toMentorshipView(user, row, byHandle),
    messages: messages.map((message) => ({ id: message.id, body: message.body, createdAt: message.createdAt, mine: message.authorId === user.id })),
    canWrite: row.status === "ACTIVE" && row.counterpartId !== null,
  };
}

// ─── Leaderboards ────────────────────────────────────────────────────────────

export type LeaderboardsView = {
  comparison: SelfComparison[];
  onLeaderboards: boolean;
  metric: LeaderboardMetric | null;
  rows: ReturnType<typeof buildBoard>;
  /** Scope of the board: everyone, or one guild the viewer belongs to. */
  guild: Guild | null;
  guilds: Guild[];
};

export async function getLeaderboards(
  user: UserLike,
  metric: LeaderboardMetric | null,
  guildSlug: string | null,
): Promise<LeaderboardsView> {
  const [viewer, stats] = await Promise.all([buildViewer(user), getViewerStats(user)]);
  const guild = guildSlug ? ((await directory.findGuild(guildSlug)) ?? null) : null;

  const subjects: BoardSubject[] = metric
    ? (await directory.leaderboardSubjects(guild?.slug ?? null)).filter((subject) => subject.handle !== user.handle)
    : [];

  // The viewer is listed only if they asked to be, and only where they belong.
  if (metric && viewer.card.settings.onLeaderboards && (!guild || viewer.card.guilds.includes(guild.slug))) {
    subjects.push({
      handle: user.handle,
      name: viewer.card.name,
      isViewer: true,
      xpRecent: stats.xpRecent,
      xpPrevious: stats.xpPrevious,
      challengesCompleted: stats.challengesCompleted,
      achievements: stats.achievements,
    });
  }

  return {
    comparison: selfComparison(stats),
    onLeaderboards: viewer.card.settings.onLeaderboards,
    metric,
    rows: metric ? buildBoard(subjects, metric) : [],
    guild,
    guilds: await guildsBySlug(viewer.card.guilds),
  };
}

// ─── The viewer's own social profile ─────────────────────────────────────────

export type SocialProfileView = { viewer: ViewerCard; stats: ViewerStats; guilds: Guild[] };

export async function getSocialProfile(user: UserLike): Promise<SocialProfileView> {
  const [viewer, stats] = await Promise.all([buildViewer(user), getViewerStats(user)]);
  return { viewer: viewer.card, stats, guilds: await guildsBySlug(viewer.card.guilds) };
}

export async function saveSocialProfile(user: UserLike, input: SocialProfileInput) {
  return socialRepository.upsertProfile(user.id, input);
}

// ─── Actions on the user's side ──────────────────────────────────────────────

export async function joinGuild(user: UserLike, slug: string) {
  if (!(await directory.findGuild(slug))) throw new SocialError("That guild doesn't exist");
  await socialRepository.joinGuild(user.id, slug);
}

export async function leaveGuild(user: UserLike, slug: string) {
  await socialRepository.leaveGuild(user.id, slug);
}

/**
 * Joining a group challenge starts the user's *own* challenge from the normal
 * template, so their days are earned by real quests exactly as they would be
 * alone. The group only provides company.
 */
export async function joinGroupChallenge(user: UserLike, groupKey: string) {
  const group = directory.findGroupChallenge(groupKey);
  if (!group) throw new SocialError("That group challenge doesn't exist");

  const previous = await socialRepository.findGroupEntry(user.id, groupKey);
  if (previous?.challenge?.status === "ACTIVE") throw new SocialError("You're already in this one");
  // A finished or closed run makes room for another go.
  if (previous) await socialRepository.deleteGroupEntry(user.id, groupKey);

  const overview = await challenges.getChallengesOverview(user);
  const existing = overview.active.find((challenge) => challenge.templateKey === group.templateKey);
  if (existing) {
    // Already running it alone — join the group with the challenge in progress.
    await socialRepository.createGroupEntry(user.id, groupKey, existing.id);
    return;
  }

  try {
    const started = await challenges.startChallenge(user, group.templateKey);
    await socialRepository.createGroupEntry(user.id, groupKey, started.id);
  } catch (error) {
    if (error instanceof challenges.ChallengeError) throw new SocialError(error.message);
    throw error;
  }
}

/** Leaving the group keeps the challenge: it was always the user's own. */
export async function leaveGroupChallenge(user: UserLike, groupKey: string) {
  await socialRepository.deleteGroupEntry(user.id, groupKey);
}

/** Open requests a member can have waiting at once — enough to ask around, not to spam. */
export const MAX_PENDING_REQUESTS = 5;

/**
 * Asks a visible member to mentor the user (role MENTEE), or offers to mentor
 * them (role MENTOR). It stays PENDING until they answer.
 */
export async function requestMentorship(user: UserLike, input: MentorshipRequestInput) {
  if (input.handle === user.handle) throw new SocialError("You can't mentor yourself");
  const person = await directory.findPerson(input.handle);
  const target = person ? await userRepository.findByHandle(person.handle) : null;
  if (!person || !target) throw new SocialError("That person isn't in the community");

  if (input.role === "MENTEE" && (!person.openToMentoring || person.mentorsIn.length === 0)) {
    throw new SocialError(`${person.displayName} isn't taking on anyone right now`);
  }
  if (input.role === "MENTOR" && person.seekingMentorIn.length === 0) {
    throw new SocialError(`${person.displayName} isn't looking for a mentor right now`);
  }
  if (await socialRepository.findOpenBetween(user.id, target.id)) {
    throw new SocialError(`You already have a mentorship or a request open with ${person.displayName}`);
  }
  if ((await socialRepository.countPendingRequests(user.id)) >= MAX_PENDING_REQUESTS) {
    throw new SocialError(`You have ${MAX_PENDING_REQUESTS} requests waiting already — withdraw one, or wait for answers`);
  }

  await socialRepository.requestMentorship({
    userId: user.id,
    role: input.role,
    counterpartId: target.id,
    counterpartHandle: target.handle,
    topic: input.topic,
    message: input.message,
  });
}

/** The asked member accepts or declines. Only they can. */
export async function respondToMentorship(user: UserLike, mentorshipId: string, accept: boolean) {
  const row = await socialRepository.findMentorshipForMember(user.id, mentorshipId);
  if (!row || row.counterpartId !== user.id) throw new SocialError("That request doesn't exist");
  if (row.status !== "PENDING") throw new SocialError("That request was already answered");
  await socialRepository.setMentorshipStatus(row.id, accept ? "ACTIVE" : "DECLINED");
}

/** Either member can close a mentorship; a pending request can be withdrawn or declined. */
export async function endMentorship(user: UserLike, mentorshipId: string) {
  const row = await socialRepository.findMentorshipForMember(user.id, mentorshipId);
  if (!row) throw new SocialError("That mentorship doesn't exist");
  if (row.status === "ENDED" || row.status === "DECLINED") return;
  if (row.status === "PENDING" && row.counterpartId === user.id) {
    await socialRepository.setMentorshipStatus(row.id, "DECLINED");
    return;
  }
  await socialRepository.setMentorshipStatus(row.id, "ENDED");
}

/** A steady pace for notes; this isn't a chat room. */
export const MESSAGES_PER_HOUR = 30;

export async function sendMentorshipMessage(user: UserLike, mentorshipId: string, body: string) {
  const text = body.trim();
  if (text.length === 0) throw new SocialError("Write something first");
  if (text.length > MAX_MENTORSHIP_NOTE) throw new SocialError(`Keep it under ${MAX_MENTORSHIP_NOTE} characters`);

  const row = await socialRepository.findMentorshipForMember(user.id, mentorshipId);
  if (!row || row.counterpartId === null) throw new SocialError("That mentorship doesn't exist");
  if (row.status !== "ACTIVE") throw new SocialError("This mentorship is closed");
  if ((await socialRepository.countMessagesSince(user.id, new Date(Date.now() - 3_600_000))) >= MESSAGES_PER_HOUR) {
    throw new SocialError("That's a lot of notes for one hour — take a breath and try again later");
  }
  await socialRepository.createMessage(row.id, user.id, text);
}

/** Convenience for pages: the current user plus everything the hub needs. */
export async function currentUserOverview(): Promise<CommunityOverview> {
  return getCommunityOverview(await getCurrentUser());
}
