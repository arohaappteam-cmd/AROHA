import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

/** Data access for assessment attempts. Attempts are append-only records. */
export const assessmentRepository = {
  listAttempts(userId: string, limit?: number) {
    return db.assessmentAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        assessmentKey: true,
        kind: true,
        title: true,
        percent: true,
        outcome: true,
        evaluator: true,
        xpAwarded: true,
        createdAt: true,
        skill: { select: { id: true, slug: true, name: true, tree: { select: { slug: true, name: true, emoji: true } } } },
      },
    });
  },

  listAttemptsFor(userId: string, assessmentKey: string) {
    return db.assessmentAttempt.findMany({
      where: { userId, assessmentKey },
      orderBy: { createdAt: "desc" },
      select: { id: true, percent: true, outcome: true, evaluator: true, createdAt: true },
    });
  },

  findAttemptOwned(userId: string, attemptId: string) {
    return db.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        skill: { select: { slug: true, name: true, tree: { select: { slug: true, name: true, emoji: true } } } },
        project: { select: { id: true, title: true } },
        evidence: true,
      },
    });
  },

  async hasPassed(userId: string, assessmentKey: string): Promise<boolean> {
    const found = await db.assessmentAttempt.findFirst({
      where: { userId, assessmentKey, outcome: "PASSED" },
      select: { id: true },
    });
    return found !== null;
  },

  create(data: Prisma.AssessmentAttemptUncheckedCreateInput, evidence?: { title: string; url: string }) {
    return db.assessmentAttempt.create({
      data: {
        ...data,
        ...(evidence ? { evidence: { create: { userId: data.userId, kind: "LINK", title: evidence.title, url: evidence.url } } } : {}),
      },
    });
  },

  setXpAwarded(attemptId: string, xpAwarded: number) {
    return db.assessmentAttempt.update({ where: { id: attemptId }, data: { xpAwarded } });
  },

  /** Completed projects with evidence that used a given skill. */
  eligibleProjectsForSkill(userId: string, skillId: string) {
    return db.project.findMany({
      where: { userId, status: "COMPLETED", skills: { some: { skillId } }, evidence: { some: {} } },
      orderBy: { completedAt: "desc" },
      include: { evidence: { orderBy: { createdAt: "asc" } } },
    });
  },

  /** Skills used by the user's completed, evidenced projects — reviewable by project. */
  async projectReviewableSkills(userId: string) {
    const rows = await db.projectSkill.findMany({
      where: { project: { userId, status: "COMPLETED", evidence: { some: {} } } },
      distinct: ["skillId"],
      select: { skill: { select: { id: true, slug: true, name: true, tree: { select: { slug: true, name: true, emoji: true } } } } },
    });
    return rows.map((row) => row.skill);
  },
};
