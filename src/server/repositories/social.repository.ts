import "server-only";

import type { MentorshipRole } from "@/generated/prisma/enums";
import type { SocialProfileInput } from "@/modules/social/schemas";
import { db } from "@/server/db";

/**
 * The user's own community choices: what they share, which guilds they joined,
 * which group challenges they entered, and their mentorships. The people on
 * the other side come from the seeded directory, not from here.
 */
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
    return db.groupChallengeEntry.findUnique({ where: { userId_groupKey: { userId, groupKey } } });
  },

  createGroupEntry(userId: string, groupKey: string, challengeId: string | null) {
    return db.groupChallengeEntry.create({ data: { userId, groupKey, challengeId } });
  },

  deleteGroupEntry(userId: string, groupKey: string) {
    return db.groupChallengeEntry.deleteMany({ where: { userId, groupKey } });
  },

  listMentorships(userId: string) {
    return db.mentorship.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { startedAt: "desc" }] });
  },

  createMentorship(data: { userId: string; role: MentorshipRole; counterpartHandle: string; topic: string; message: string | null }) {
    return db.mentorship.create({ data });
  },

  findMentorship(userId: string, mentorshipId: string) {
    return db.mentorship.findFirst({ where: { id: mentorshipId, userId } });
  },

  endMentorship(mentorshipId: string) {
    return db.mentorship.update({ where: { id: mentorshipId }, data: { status: "ENDED", endedAt: new Date() } });
  },

  countCompletedChallenges(userId: string) {
    return db.challenge.count({ where: { userId, status: "COMPLETED" } });
  },
};
