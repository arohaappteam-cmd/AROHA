import "server-only";

import { db } from "@/server/db";

/**
 * Batch reads behind the live community directory. Each runs once per
 * request for the whole visible membership — never once per person.
 */

/** Most recently active first; a soft cap keeps a page's work bounded. */
export const MAX_VISIBLE_MEMBERS = 500;

const DAY_MS = 86_400_000;

type CountRow = { userId: string; _count: { _all: number } };
type SumRow = { userId: string; _sum: { amount: number | null } };

const toCounts = (rows: CountRow[]) => new Map(rows.map((row) => [row.userId, row._count._all]));
const toSums = (rows: SumRow[]) => new Map(rows.map((row) => [row.userId, row._sum.amount ?? 0]));

export const communityRepository = {
  /** Members whose profile is visible, with what's needed to describe them. */
  listVisibleProfiles() {
    return db.socialProfile.findMany({
      where: { visibility: "COMMUNITY" },
      orderBy: { updatedAt: "desc" },
      take: MAX_VISIBLE_MEMBERS,
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            pronouns: true,
            bio: true,
            createdAt: true,
            character: true,
            interests: { select: { label: true }, orderBy: { createdAt: "asc" } },
            lifeAreas: true,
            guilds: { select: { guildSlug: true } },
          },
        },
      },
    });
  },

  /** XP, quests, achievements and challenges for a set of members. */
  async activity(userIds: string[], now = new Date()) {
    const recentFrom = new Date(now.getTime() - 28 * DAY_MS);
    const previousFrom = new Date(now.getTime() - 56 * DAY_MS);
    const users = { in: userIds };

    const [total, recent, previous, quests, achievements, challenges] = await Promise.all([
      db.xpTransaction.groupBy({ by: ["userId"], where: { userId: users }, _sum: { amount: true } }),
      db.xpTransaction.groupBy({ by: ["userId"], where: { userId: users, createdAt: { gte: recentFrom } }, _sum: { amount: true } }),
      db.xpTransaction.groupBy({
        by: ["userId"],
        where: { userId: users, createdAt: { gte: previousFrom, lt: recentFrom } },
        _sum: { amount: true },
      }),
      db.questCompletion.groupBy({ by: ["userId"], where: { userId: users, completedAt: { gte: recentFrom } }, _count: { _all: true } }),
      db.userAchievement.groupBy({ by: ["userId"], where: { userId: users }, _count: { _all: true } }),
      db.challenge.groupBy({ by: ["userId"], where: { userId: users, status: "COMPLETED" }, _count: { _all: true } }),
    ]);

    return {
      totalXp: toSums(total),
      xpRecent: toSums(recent),
      xpPrevious: toSums(previous),
      questsRecent: toCounts(quests),
      achievements: toCounts(achievements),
      challengesCompleted: toCounts(challenges),
    };
  },

  /** Skill XP per member and skill, plus the catalogue needed to turn it into levels. */
  async skillXp(userIds: string[]) {
    const [rows, skills] = await Promise.all([
      db.skillXpTransaction.groupBy({ by: ["userId", "skillId"], where: { userId: { in: userIds } }, _sum: { amount: true } }),
      db.skill.findMany({ select: { id: true, name: true, maxLevel: true, baseXp: true, tree: { select: { slug: true } } } }),
    ]);
    return { rows: rows.map((row) => ({ userId: row.userId, skillId: row.skillId, xp: row._sum.amount ?? 0 })), skills };
  },

  /** Active mentorships between members, as requester → counterpart handles. */
  async activeMentorships(userIds: string[]) {
    const rows = await db.mentorship.findMany({
      where: { status: "ACTIVE", counterpartId: { not: null }, OR: [{ userId: { in: userIds } }, { counterpartId: { in: userIds } }] },
      select: { role: true, user: { select: { handle: true } }, counterpart: { select: { handle: true } } },
    });
    return rows.flatMap((row) => (row.counterpart ? [{ role: row.role, requester: row.user.handle, counterpart: row.counterpart.handle }] : []));
  },

  /** Everyone in each guild, visible or not. */
  async guildMemberCounts() {
    const rows = await db.guildMembership.groupBy({ by: ["guildSlug"], _count: { _all: true } });
    return new Map(rows.map((row) => [row.guildSlug, row._count._all]));
  },

  /**
   * People running a group challenge: an active challenge, or one finished
   * in the last two weeks so the people who made it still show.
   */
  groupEntries(groupKey: string, now = new Date()) {
    const recently = new Date(now.getTime() - 14 * DAY_MS);
    return db.groupChallengeEntry.findMany({
      where: {
        groupKey,
        challenge: { OR: [{ status: "ACTIVE" }, { status: "COMPLETED", completedAt: { gte: recently } }] },
      },
      select: {
        user: { select: { handle: true, socialProfile: { select: { visibility: true } } } },
        challenge: { select: { _count: { select: { days: true } } } },
      },
    });
  },
};
