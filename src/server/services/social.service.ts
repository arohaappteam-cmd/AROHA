import "server-only";

import type { User } from "@/generated/prisma/client";
import type { LifeArea, MentorshipRole } from "@/generated/prisma/enums";
import { buildAnalyticsDataset } from "@/server/services/analytics.service";
import { buildOverview } from "@/modules/analytics/overview";
import { formatDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { toAppearance, type AvatarAppearance } from "@/modules/identity/avatar";
import { focusAreas as pickFocusAreas, resolveLifeAreas } from "@/modules/identity/life-areas";
import { getLevelProgress, tierForLevel, type TierTitle } from "@/modules/progression";
import { seededDirectory, type SocialDirectory } from "@/modules/social/directory";
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
import type { MentorshipRequestInput, SocialProfileInput } from "@/modules/social/schemas";
import type { GroupChallenge, Guild, MentorTier, SocialPerson } from "@/modules/social/types";
import { getCurrentUser } from "@/server/auth/current-user";
import { goalRepository } from "@/server/repositories/goal.repository";
import { identityRepository } from "@/server/repositories/identity.repository";
import { progressionRepository } from "@/server/repositories/progression.repository";
import { socialRepository } from "@/server/repositories/social.repository";
import * as challenges from "@/server/services/challenge.service";
import { getSkillsOverview } from "@/server/services/skill.service";

/**
 * The community layer (spec §44–46) — a demonstration, not a network.
 *
 * Everyone the user meets here comes from `SocialDirectory`, which today
 * serves seeded sample people. There is no second account, no messaging and
 * no feed. What *is* real is the user's side: the guilds they join, the group
 * challenges they enter (which start an ordinary personal challenge, earned
 * through real quests) and the mentorships they record.
 *
 * Nothing about the user is shared until they choose it: a social profile is
 * PRIVATE until changed, and leaderboards list nobody who hasn't opted in.
 */

type UserLike = Pick<User, "id" | "timezone" | "displayName">;

export class SocialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialError";
  }
}

/** Swappable for a database-backed directory when real accounts arrive. */
let directory: SocialDirectory = seededDirectory;

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
  /** Day the group's window opened, and how far through it is. */
  startDate: string;
  dayOfWindow: number;
  participants: { person: SocialPerson; daysDone: number; percent: number }[];
  /** The user's own challenge, when they've joined. */
  you: { joined: true; daysDone: number; percent: number; status: string; challengeId: string | null } | { joined: false };
};

type GroupEntry = Awaited<ReturnType<typeof socialRepository.listGroupEntries>>[number];

function toGroupView(challenge: GroupChallenge, entry: GroupEntry | undefined, today: string): GroupChallengeView {
  const guild = directory.findGuild(challenge.guildSlug)!;
  const startDate = formatDateOnly(new Date(Date.parse(`${today}T00:00:00.000Z`) - challenge.startedDaysAgo * 86_400_000));
  const participants = challenge.participants
    .flatMap((participant) => {
      const person = directory.findPerson(participant.handle);
      return person
        ? [{ person, daysDone: participant.daysDone, percent: Math.min(100, Math.round((participant.daysDone / challenge.targetDays) * 100)) }]
        : [];
    })
    .sort((a, b) => b.daysDone - a.daysDone);

  const daysDone = entry?.challenge?.days.length ?? 0;
  return {
    challenge,
    guild,
    startDate,
    dayOfWindow: Math.min(challenge.startedDaysAgo + 1, challenge.durationDays),
    participants,
    you: entry
      ? {
          joined: true,
          daysDone,
          percent: Math.min(100, Math.round((daysDone / challenge.targetDays) * 100)),
          status: entry.challenge?.status ?? "ENDED",
          challengeId: entry.challengeId,
        }
      : { joined: false },
  };
}

export async function getGroupChallenges(user: UserLike): Promise<GroupChallengeView[]> {
  const today = todayInTimezone(user.timezone);
  const entries = await socialRepository.listGroupEntries(user.id);
  const byKey = new Map(entries.map((entry) => [entry.groupKey, entry]));
  return directory
    .listGroupChallenges()
    .map((challenge) => toGroupView(challenge, byKey.get(challenge.key), today))
    .sort((a, b) => Number(b.you.joined) - Number(a.you.joined) || a.challenge.startedDaysAgo - b.challenge.startedDaysAgo);
}

// ─── Guilds ──────────────────────────────────────────────────────────────────

export type GuildCard = { guild: Guild; joined: boolean; members: SocialPerson[]; reasons: string[] };

export type GuildsView = {
  joined: GuildCard[];
  suggested: GuildMatch[];
  all: GuildCard[];
};

export async function getGuilds(user: UserLike): Promise<GuildsView> {
  const { context } = await buildViewer(user);
  const joinedSlugs = new Set(context.guilds);
  const ranked = rankGuilds(context, directory.listGuilds());
  const cards = ranked.map((match): GuildCard => ({
    guild: match.subject,
    joined: joinedSlugs.has(match.subject.slug),
    members: [...directory.guildMembers(match.subject.slug)].slice(0, 5),
    reasons: match.reasons,
  }));

  return {
    joined: cards.filter((card) => card.joined),
    suggested: ranked.filter((match) => !joinedSlugs.has(match.subject.slug) && match.reasons.length > 0).slice(0, 3),
    all: cards.sort((a, b) => a.guild.name.localeCompare(b.guild.name)),
  };
}

export type GuildDetail = {
  guild: Guild;
  joined: boolean;
  members: SocialPerson[];
  mentors: SocialPerson[];
  challenges: GroupChallengeView[];
  /** Interests the viewer shares with the guild's subject matter. */
  shared: string[];
};

export async function getGuildDetail(user: UserLike, slug: string): Promise<GuildDetail | null> {
  const guild = directory.findGuild(slug);
  if (!guild) return null;

  const today = todayInTimezone(user.timezone);
  const [{ context }, entries] = await Promise.all([buildViewer(user), socialRepository.listGroupEntries(user.id)]);
  const byKey = new Map(entries.map((entry) => [entry.groupKey, entry]));
  const members = [...directory.guildMembers(slug)];

  return {
    guild,
    joined: context.guilds.includes(slug),
    members,
    mentors: members.filter((person) => person.openToMentoring && person.mentorsIn.length > 0),
    challenges: directory.guildChallenges(slug).map((challenge) => toGroupView(challenge, byKey.get(challenge.key), today)),
    shared: sharedInterests(context.interests, guild.interests),
  };
}

// ─── Discovery and people ────────────────────────────────────────────────────

export type CommunityOverview = {
  viewer: ViewerCard;
  directoryKind: SocialDirectory["kind"];
  discovery: PersonMatch[];
  guilds: GuildsView;
  groupChallenges: GroupChallengeView[];
  mentorships: MentorshipView[];
  chain: MentorshipChain | null;
  comparison: SelfComparison[];
};

export async function getCommunityOverview(user: UserLike): Promise<CommunityOverview> {
  const [viewer, stats, guilds, groupChallenges, mentorships] = await Promise.all([
    buildViewer(user),
    getViewerStats(user),
    getGuilds(user),
    getGroupChallenges(user),
    getMentorships(user),
  ]);

  return {
    viewer: viewer.card,
    directoryKind: directory.kind,
    discovery: discoverPeople(viewer.context, directory.listPeople(), 6),
    guilds,
    groupChallenges: groupChallenges.filter((view) => view.you.joined).concat(groupChallenges.filter((view) => !view.you.joined)).slice(0, 3),
    mentorships,
    chain: mentorshipChains(directory.listPeople())[0] ?? null,
    comparison: selfComparison(stats),
  };
}

export type PersonView = {
  person: SocialPerson;
  shared: { interests: string[]; guilds: Guild[]; focusAreas: LifeArea[] };
  guilds: Guild[];
  mentoredBy: SocialPerson[];
  mentoring: SocialPerson[];
  /** The viewer's mentorship with this person, if any. */
  mentorship: MentorshipView | null;
  viewer: ViewerCard;
};

export async function getPerson(user: UserLike, handle: string): Promise<PersonView | null> {
  const person = directory.findPerson(handle);
  if (!person) return null;

  const [viewer, mentorships] = await Promise.all([buildViewer(user), getMentorships(user)]);
  const people = directory.listPeople();

  return {
    person,
    shared: {
      interests: sharedInterests(viewer.context.interests, person.interests),
      guilds: person.guilds.filter((slug) => viewer.context.guilds.includes(slug)).flatMap((slug) => {
        const guild = directory.findGuild(slug);
        return guild ? [guild] : [];
      }),
      focusAreas: person.focusAreas.filter((area) => viewer.context.focusAreas.includes(area)),
    },
    guilds: person.guilds.flatMap((slug) => {
      const guild = directory.findGuild(slug);
      return guild ? [guild] : [];
    }),
    mentoredBy: person.mentoredBy.flatMap((mentor) => people.filter((candidate) => candidate.handle === mentor)),
    mentoring: person.mentoring.flatMap((mentee) => people.filter((candidate) => candidate.handle === mentee)),
    mentorship: mentorships.find((entry) => entry.person?.handle === handle && entry.status === "ACTIVE") ?? null,
    viewer: viewer.card,
  };
}

// ─── Mentorship ──────────────────────────────────────────────────────────────

export type MentorshipView = {
  id: string;
  role: MentorshipRole;
  status: string;
  topic: string;
  message: string | null;
  startedAt: Date;
  person: SocialPerson | null;
  /** The agreed shape of the mentorship — seeded, deterministic guidance. */
  plan: string[];
};

export async function getMentorships(user: UserLike): Promise<MentorshipView[]> {
  const rows = await socialRepository.listMentorships(user.id);
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    status: row.status,
    topic: row.topic,
    message: row.message,
    startedAt: row.startedAt,
    person: directory.findPerson(row.counterpartHandle) ?? null,
    plan: startingPlan(row.topic, row.role),
  }));
}

export type MentorshipHub = {
  viewer: ViewerCard;
  directoryKind: SocialDirectory["kind"];
  mentorships: MentorshipView[];
  mentors: MentorMatch[];
  mentees: MenteeMatch[];
  chains: MentorshipChain[];
};

export async function getMentorshipHub(user: UserLike): Promise<MentorshipHub> {
  const [viewer, mentorships] = await Promise.all([buildViewer(user), getMentorships(user)]);
  const people = directory.listPeople();
  const engaged = new Set(mentorships.filter((entry) => entry.status === "ACTIVE").map((entry) => entry.person?.handle));

  return {
    viewer: viewer.card,
    directoryKind: directory.kind,
    mentorships,
    mentors: findMentors(viewer.context, people, viewer.card.mentorTier)
      .filter((match) => !engaged.has(match.person.handle))
      .slice(0, 4),
    mentees: findMentees(people, viewer.card.canMentorIn)
      .filter((match) => !engaged.has(match.person.handle))
      .slice(0, 3),
    chains: mentorshipChains(people).slice(0, 2),
  };
}

// ─── Leaderboards ────────────────────────────────────────────────────────────

export type LeaderboardsView = {
  comparison: SelfComparison[];
  directoryKind: SocialDirectory["kind"];
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
  const guild = guildSlug ? (directory.findGuild(guildSlug) ?? null) : null;

  const people = guild ? directory.guildMembers(guild.slug) : directory.listPeople();
  const subjects: BoardSubject[] = people.map((person) => ({
    handle: person.handle,
    name: person.displayName,
    isViewer: false,
    xpRecent: person.xpRecent,
    xpPrevious: person.xpPrevious,
    challengesCompleted: person.challengesCompleted,
    achievements: person.achievements,
  }));

  // The viewer is listed only if they asked to be, and only where they belong.
  if (viewer.card.settings.onLeaderboards && (!guild || viewer.card.guilds.includes(guild.slug))) {
    subjects.push({
      handle: "you",
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
    directoryKind: directory.kind,
    onLeaderboards: viewer.card.settings.onLeaderboards,
    metric,
    rows: metric ? buildBoard(subjects, metric) : [],
    guild,
    guilds: viewer.card.guilds.flatMap((slug) => {
      const found = directory.findGuild(slug);
      return found ? [found] : [];
    }),
  };
}

// ─── The viewer's own social profile ─────────────────────────────────────────

export type SocialProfileView = { viewer: ViewerCard; stats: ViewerStats; guilds: Guild[] };

export async function getSocialProfile(user: UserLike): Promise<SocialProfileView> {
  const [viewer, stats] = await Promise.all([buildViewer(user), getViewerStats(user)]);
  return {
    viewer: viewer.card,
    stats,
    guilds: viewer.card.guilds.flatMap((slug) => {
      const guild = directory.findGuild(slug);
      return guild ? [guild] : [];
    }),
  };
}

export async function saveSocialProfile(user: UserLike, input: SocialProfileInput) {
  return socialRepository.upsertProfile(user.id, input);
}

// ─── Actions on the user's side ──────────────────────────────────────────────

export async function joinGuild(user: UserLike, slug: string) {
  if (!directory.findGuild(slug)) throw new SocialError("That guild doesn't exist");
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
  if (await socialRepository.findGroupEntry(user.id, groupKey)) throw new SocialError("You're already in this one");

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

export async function requestMentorship(user: UserLike, input: MentorshipRequestInput) {
  const person = directory.findPerson(input.handle);
  if (!person) throw new SocialError("That person isn't in the community");
  if (input.role === "MENTEE" && !person.openToMentoring) throw new SocialError(`${person.displayName} isn't taking on anyone right now`);
  if (input.role === "MENTOR" && person.seekingMentorIn.length === 0) {
    throw new SocialError(`${person.displayName} isn't looking for a mentor right now`);
  }

  const existing = await socialRepository.listMentorships(user.id);
  if (existing.some((row) => row.counterpartHandle === person.handle && row.status === "ACTIVE")) {
    throw new SocialError(`You already have a mentorship with ${person.displayName}`);
  }

  await socialRepository.createMentorship({
    userId: user.id,
    role: input.role,
    counterpartHandle: person.handle,
    topic: input.topic,
    message: input.message,
  });
}

export async function endMentorship(user: UserLike, mentorshipId: string) {
  const mentorship = await socialRepository.findMentorship(user.id, mentorshipId);
  if (!mentorship) throw new SocialError("That mentorship doesn't exist");
  if (mentorship.status === "ENDED") return;
  await socialRepository.endMentorship(mentorshipId);
}

/** Convenience for pages: the current user plus everything the hub needs. */
export async function currentUserOverview(): Promise<CommunityOverview> {
  return getCommunityOverview(await getCurrentUser());
}
