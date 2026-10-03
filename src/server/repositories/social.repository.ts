import "server-only";

import type { MentorshipRole, MentorshipStatus } from "@/generated/prisma/enums";
import type { SocialProfileInput } from "@/modules/social/schemas";
import { db } from "@/server/db";

/**
 * The user's own community choices: what they share, which guilds they joined,
 * which group challenges they entered, and the mentorships they're part of.
 * Other members are read through the community directory, not from here.
 */

const PARTY = { select: { id: true, handle: true, displayName: true } } as const;
export const socialRepository = {
  findProfile(userId: string) {
    return db.socialProfile.findUnique({ where: { userId } });
  },

  upsertProfile(userId: string, input: SocialProfileInput) {
    return db.socialProfile.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
    });
  },

  listGuilds(userId: string) {
    return db.guildMembership.findMany({ where: { userId }, orderBy: { joinedAt: "asc" } });
  },

  joinGuild(userId: string, guildSlug: string) {
    return db.guildMembership.upsert({
      where: { userId_guildSlug: { userId, guildSlug } },
      create: { userId, guildSlug },
      update: {},
    });
  },

  leaveGuild(userId: string, guildSlug: string) {
    return db.guildMembership.deleteMany({ where: { userId, guildSlug } });
  },

  listGroupEntries(userId: string) {
    return db.groupChallengeEntry.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: { challenge: { include: { days: true } } },
    });
  },

  findGroupEntry(userId: string, groupKey: string) {
    return db.groupChallengeEntry.findUnique({
      where: { userId_groupKey: { userId, groupKey } },
      include: { challenge: { select: { status: true } } },
    });
  },

  createGroupEntry(userId: string, groupKey: string, challengeId: string | null) {
    return db.groupChallengeEntry.create({ data: { userId, groupKey, challengeId } });
  },

  deleteGroupEntry(userId: string, groupKey: string) {
    return db.groupChallengeEntry.deleteMany({ where: { userId, groupKey } });
  },

  /** Every mentorship the user is in, whichever side asked. */
  listMentorships(userId: string) {
    return db.mentorship.findMany({
      where: { OR: [{ userId }, { counterpartId: userId }] },
      orderBy: { startedAt: "desc" },
      include: { user: PARTY, counterpart: PARTY },
    });
  },

  /** One mentorship, only if the user is one of its two members. */
  findMentorshipForMember(userId: string, mentorshipId: string) {
    return db.mentorship.findFirst({
      where: { id: mentorshipId, OR: [{ userId }, { counterpartId: userId }] },
      include: { user: PARTY, counterpart: PARTY },
    });
  },

  /** A pending or active mentorship between two members, either way round. */
  findOpenBetween(a: string, b: string) {
    return db.mentorship.findFirst({
      where: {
        status: { in: ["PENDING", "ACTIVE"] },
        OR: [
          { userId: a, counterpartId: b },
          { userId: b, counterpartId: a },
        ],
      },
    });
  },

  countPendingRequests(userId: string) {
    return db.mentorship.count({ where: { userId, status: "PENDING" } });
  },

  /** Asks (or asks again, after a decline or an ending) — one row per pair and role. */
  requestMentorship(data: { userId: string; role: MentorshipRole; counterpartId: string; counterpartHandle: string; topic: string; message: string | null }) {
    const fresh = { counterpartId: data.counterpartId, topic: data.topic, message: data.message, status: "PENDING" as const, startedAt: new Date(), respondedAt: null, endedAt: null };
    return db.mentorship.upsert({
      where: { userId_role_counterpartHandle: { userId: data.userId, role: data.role, counterpartHandle: data.counterpartHandle } },
      create: { userId: data.userId, role: data.role, counterpartHandle: data.counterpartHandle, ...fresh },
      update: fresh,
    });
  },

  setMentorshipStatus(mentorshipId: string, status: MentorshipStatus) {
    const now = new Date();
    return db.mentorship.update({
      where: { id: mentorshipId },
      data: {
        status,
        ...(status === "ACTIVE" || status === "DECLINED" ? { respondedAt: now } : {}),
        ...(status === "ENDED" ? { endedAt: now } : {}),
      },
    });
  },

  listMessages(mentorshipId: string) {
    return db.mentorshipMessage.findMany({ where: { mentorshipId }, orderBy: { createdAt: "asc" }, take: 200 });
  },

  createMessage(mentorshipId: string, authorId: string, body: string) {
    return db.mentorshipMessage.create({ data: { mentorshipId, authorId, body } });
  },

  countMessagesSince(authorId: string, since: Date) {
    return db.mentorshipMessage.count({ where: { authorId, createdAt: { gte: since } } });
  },

  countCompletedChallenges(userId: string) {
    return db.challenge.count({ where: { userId, status: "COMPLETED" } });
  },
};
