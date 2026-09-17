import "server-only";

import { db } from "@/server/db";

/** Read-only queries behind the Skill Passport. Everything here is already earned. */
export const passportRepository = {
  passedAttempts(userId: string) {
    return db.assessmentAttempt.findMany({
      where: { userId, outcome: "PASSED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        assessmentKey: true,
        kind: true,
        title: true,
        percent: true,
        evaluator: true,
        createdAt: true,
        skillId: true,
        evidence: { select: { id: true, title: true, url: true, kind: true, note: true, createdAt: true } },
      },
    });
  },

  projects(userId: string) {
    return db.project.findMany({
      where: { userId },
      orderBy: [{ completedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        reflection: true,
        completedAt: true,
        skills: { select: { skillId: true, skill: { select: { name: true } } } },
        milestones: { select: { id: true, title: true, completedAt: true } },
        evidence: { orderBy: { createdAt: "asc" }, select: { id: true, title: true, url: true, kind: true, note: true, createdAt: true } },
      },
    });
  },

  skillsWithTrees() {
    return db.skill.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        baseXp: true,
        maxLevel: true,
        tree: { select: { slug: true, name: true, emoji: true, lifeArea: true } },
      },
    });
  },

  achievements(userId: string) {
    return db.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
      select: { unlockedAt: true, achievement: { select: { slug: true, name: true, description: true } } },
    });
  },

  completedChallenges(userId: string) {
    return db.challenge.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { id: true, title: true, emoji: true, durationDays: true, targetDays: true, completedAt: true },
    });
  },

  experiences(userId: string, limit: number) {
    return db.questCompletion.findMany({
      where: { userId, quest: { lifeArea: "EXPERIENCES" } },
      orderBy: { completedAt: "desc" },
      take: limit,
      select: { id: true, completedAt: true, note: true, quest: { select: { title: true } } },
    });
  },

  completedGoals(userId: string) {
    return db.goal.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { id: true, title: true, completedAt: true, lifeArea: true },
    });
  },

  completedGoalMilestones(userId: string, limit: number) {
    return db.milestone.findMany({
      where: { goal: { userId }, status: "COMPLETED", completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: limit,
      select: { id: true, title: true, completedAt: true, goal: { select: { id: true, title: true } } },
    });
  },
};
