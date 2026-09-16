import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { ChallengeStatus, LifeArea } from "@/generated/prisma/enums";
import { db } from "@/server/db";

/**
 * Data access for challenges. Day credits are idempotent per (challenge,
 * date), and carry the quest that earned them so an undone quest removes
 * exactly its own credit.
 */

const challengeInclude = { days: { orderBy: { date: "asc" as const }, select: { date: true, questId: true } } };

export type ChallengeWithDays = Prisma.ChallengeGetPayload<{ include: typeof challengeInclude }>;

export const challengeRepository = {
  list(userId: string): Promise<ChallengeWithDays[]> {
    return db.challenge.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: challengeInclude,
    });
  },

  listActive(userId: string): Promise<ChallengeWithDays[]> {
    return db.challenge.findMany({ where: { userId, status: "ACTIVE" }, include: challengeInclude });
  },

  findOwned(userId: string, challengeId: string): Promise<ChallengeWithDays | null> {
    return db.challenge.findFirst({ where: { id: challengeId, userId }, include: challengeInclude });
  },

  create(data: {
    userId: string;
    templateKey: string;
    title: string;
    description: string;
    emoji: string;
    lifeArea: LifeArea;
    durationDays: number;
    targetDays: number;
    xpReward: number;
    startDate: Date;
  }) {
    return db.challenge.create({ data });
  },

  setStatus(challengeId: string, status: ChallengeStatus, at: Date) {
    return db.challenge.update({
      where: { id: challengeId },
      data:
        status === "COMPLETED"
          ? { status, completedAt: at, endedAt: null }
          : status === "ACTIVE"
            ? { status, completedAt: null, endedAt: null }
            : { status, completedAt: null, endedAt: at },
    });
  },

  /** Credits a day; false when that date was already credited (P2002). */
  async creditDay(challengeId: string, userId: string, date: Date, questId: string): Promise<boolean> {
    try {
      await db.challengeDay.create({ data: { challengeId, userId, date, questId } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  },

  countDays(challengeId: string) {
    return db.challengeDay.count({ where: { challengeId } });
  },

  /** Removes the credits a quest earned; returns the challenges they were in. */
  async removeCreditsForQuest(userId: string, questId: string): Promise<string[]> {
    const credits = await db.challengeDay.findMany({ where: { userId, questId }, select: { id: true, challengeId: true } });
    if (credits.length === 0) return [];
    await db.challengeDay.deleteMany({ where: { id: { in: credits.map((credit) => credit.id) } } });
    return [...new Set(credits.map((credit) => credit.challengeId))];
  },
};
