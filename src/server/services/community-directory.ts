import "server-only";

import { cache } from "react";

import { DEFAULT_APPEARANCE, toAppearance } from "@/modules/identity/avatar";
import { focusAreas as pickFocusAreas, resolveLifeAreas } from "@/modules/identity/life-areas";
import { skillLevelForXp } from "@/modules/skills/levels";
import type { SocialDirectory } from "@/modules/social/directory";
import { findGroupChallenge, findGuild, GROUP_CHALLENGES, GUILDS } from "@/modules/social/guilds";
import type { BoardSubject } from "@/modules/social/leaderboards";
import { canMentorIn, MENTOR_MIN_LEVEL, viewerTier } from "@/modules/social/mentorship";
import type { Guild, GuildDefinition, PersonSkill, SocialPerson } from "@/modules/social/types";
import { communityRepository } from "@/server/repositories/community.repository";

/**
 * The live community: real members whose profile is visible, described only
 * by what they chose to share. Loaded once per request (React `cache`) and
 * shared by every directory call that request makes.
 */

const DAY_MS = 86_400_000;

/** Numbers kept off the person object, for boards the member opted in to. */
type BoardStats = Omit<BoardSubject, "isViewer"> & { onLeaderboards: boolean; guilds: string[] };

type Snapshot = {
  people: SocialPerson[];
  byHandle: Map<string, SocialPerson>;
  boards: BoardStats[];
};

type SkillCatalogueEntry = { id: string; name: string; maxLevel: number; baseXp: number; tree: { slug: string } };

/** Each member's strongest skill per tree, strongest trees first. */
function skillsByUser(rows: { userId: string; skillId: string; xp: number }[], catalogue: SkillCatalogueEntry[]) {
  const skills = new Map(catalogue.map((skill) => [skill.id, skill]));
  const best = new Map<string, Map<string, PersonSkill & { xp: number }>>();

  for (const row of rows) {
    const skill = skills.get(row.skillId);
    if (!skill || row.xp <= 0) continue;
    const level = skillLevelForXp(skill.baseXp, skill.maxLevel, row.xp);
    const trees = best.get(row.userId) ?? new Map();
    const current = trees.get(skill.tree.slug);
    if (!current || level > current.level || (level === current.level && row.xp > current.xp)) {
      trees.set(skill.tree.slug, { treeSlug: skill.tree.slug, label: skill.name, level, maxLevel: skill.maxLevel, xp: row.xp });
    }
    best.set(row.userId, trees);
  }

  return new Map(
    [...best].map(([userId, trees]) => [
      userId,
      [...trees.values()].sort((a, b) => b.level - a.level || b.xp - a.xp).map((skill): PersonSkill => ({ treeSlug: skill.treeSlug, label: skill.label, level: skill.level, maxLevel: skill.maxLevel })),
    ]),
  );
}

const loadSnapshot = cache(async (): Promise<Snapshot> => {
  const profiles = await communityRepository.listVisibleProfiles();
  const userIds = profiles.map((profile) => profile.userId);
  if (userIds.length === 0) return { people: [], byHandle: new Map(), boards: [] };

  const now = new Date();
  const [activity, skillXp, mentorships] = await Promise.all([
    communityRepository.activity(userIds, now),
    communityRepository.skillXp(userIds),
    communityRepository.activeMentorships(userIds),
  ]);
  const skills = skillsByUser(skillXp.rows, skillXp.skills);
  const guildTrees = new Map(GUILDS.map((guild) => [guild.slug, guild.skillTree]));

  const mentoredBy = new Map<string, string[]>();
  const mentoring = new Map<string, string[]>();
  const link = (mentor: string, mentee: string) => {
    mentoring.set(mentor, [...(mentoring.get(mentor) ?? []), mentee]);
    mentoredBy.set(mentee, [...(mentoredBy.get(mentee) ?? []), mentor]);
  };
  for (const row of mentorships) {
    if (row.role === "MENTEE") link(row.counterpart, row.requester);
    else link(row.requester, row.counterpart);
  }

  const people: SocialPerson[] = [];
  const boards: BoardStats[] = [];

  for (const profile of profiles) {
    const { user } = profile;
    const userSkills = skills.get(user.id) ?? [];
    const levels = userSkills.map((skill) => ({ treeSlug: skill.treeSlug, level: skill.level }));
    const guilds = user.guilds.map((membership) => membership.guildSlug);
    const stats = {
      totalXp: activity.totalXp.get(user.id) ?? 0,
      xpRecent: activity.xpRecent.get(user.id) ?? 0,
      xpPrevious: activity.xpPrevious.get(user.id) ?? 0,
      questsRecent: activity.questsRecent.get(user.id) ?? 0,
      achievements: activity.achievements.get(user.id) ?? 0,
      challengesCompleted: activity.challengesCompleted.get(user.id) ?? 0,
    };

    // Asking for a mentor means help with what they're still early in.
    const seeking = profile.seekingMentor
      ? [
          ...new Set([
            ...userSkills.filter((skill) => skill.level < MENTOR_MIN_LEVEL).map((skill) => skill.treeSlug),
            ...guilds.flatMap((slug) => guildTrees.get(slug) ?? []),
          ]),
        ]
      : [];

    people.push({
      handle: user.handle,
      displayName: user.displayName,
      pronouns: user.pronouns,
      avatar: user.character ? toAppearance(user.character) : DEFAULT_APPEARANCE,
      headline: profile.headline ?? "",
      about: user.bio ?? "",
      note: user.character?.motto ?? "",
      joinedDaysAgo: Math.max(0, Math.floor((now.getTime() - user.createdAt.getTime()) / DAY_MS)),
      progress: profile.showLevel
        ? { totalXp: stats.totalXp, xpRecent: stats.xpRecent, xpPrevious: stats.xpPrevious, questsRecent: stats.questsRecent }
        : null,
      record: profile.showAchievements ? { achievements: stats.achievements, challengesCompleted: stats.challengesCompleted } : null,
      interests: user.interests.map((interest) => interest.label),
      focusAreas: pickFocusAreas(resolveLifeAreas(user.lifeAreas)).map((area) => area.key),
      skills: profile.showSkills ? userSkills : [],
      guilds,
      tier: viewerTier(levels),
      mentorsIn: profile.openToMentoring ? canMentorIn(levels) : [],
      openToMentoring: profile.openToMentoring,
      seekingMentorIn: seeking,
      mentoredBy: mentoredBy.get(user.handle) ?? [],
      mentoring: mentoring.get(user.handle) ?? [],
    });

    boards.push({
      handle: user.handle,
      name: user.displayName,
      xpRecent: stats.xpRecent,
      xpPrevious: stats.xpPrevious,
      achievements: stats.achievements,
      challengesCompleted: stats.challengesCompleted,
      onLeaderboards: profile.onLeaderboards,
      guilds,
    });
  }

  return { people, byHandle: new Map(people.map((person) => [person.handle, person])), boards };
});

const loadGuildCounts = cache(() => communityRepository.guildMemberCounts());

function withCount(definition: GuildDefinition, counts: Map<string, number>): Guild {
  return { ...definition, memberCount: counts.get(definition.slug) ?? 0 };
}

export const liveDirectory: SocialDirectory = {
  async listPeople() {
    return (await loadSnapshot()).people;
  },

  async findPerson(handle) {
    return (await loadSnapshot()).byHandle.get(handle);
  },

  async listGuilds() {
    const counts = await loadGuildCounts();
    return GUILDS.map((guild) => withCount(guild, counts));
  },

  async findGuild(slug) {
    const definition = findGuild(slug);
    return definition ? withCount(definition, await loadGuildCounts()) : undefined;
  },

  async guildMembers(slug) {
    return (await loadSnapshot()).people.filter((person) => person.guilds.includes(slug));
  },

  listGroupChallenges: () => GROUP_CHALLENGES,
  findGroupChallenge,
  guildChallenges: (slug) => GROUP_CHALLENGES.filter((challenge) => challenge.guildSlug === slug),

  async groupParticipants(key, excludeHandle) {
    const [entries, { byHandle }] = await Promise.all([communityRepository.groupEntries(key), loadSnapshot()]);
    const visible = [];
    let others = 0;
    for (const entry of entries) {
      if (entry.user.handle === excludeHandle) continue;
      const person = entry.user.socialProfile?.visibility === "COMMUNITY" ? byHandle.get(entry.user.handle) : undefined;
      if (person) visible.push({ person, daysDone: entry.challenge?._count.days ?? 0 });
      else others += 1;
    }
    return { visible: visible.sort((a, b) => b.daysDone - a.daysDone), others };
  },

  async leaderboardSubjects(guildSlug) {
    return (await loadSnapshot()).boards
      .filter((entry) => entry.onLeaderboards && (!guildSlug || entry.guilds.includes(guildSlug)))
      .map(
        (entry): BoardSubject => ({
          handle: entry.handle,
          name: entry.name,
          isViewer: false,
          xpRecent: entry.xpRecent,
          xpPrevious: entry.xpPrevious,
          challengesCompleted: entry.challengesCompleted,
          achievements: entry.achievements,
        }),
      );
  },
};
