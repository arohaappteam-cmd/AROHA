import "server-only";

import type { GoalStatus } from "@/generated/prisma/enums";
import { db } from "@/server/db";

export type GoalListView = "current" | "completed" | "archived";

const roadmapSummarySelect = {
  orderBy: { order: "asc" },
  select: {
    id: true,
    title: true,
    status: true,
    missions: { orderBy: { order: "asc" }, select: { id: true, title: true, status: true } },
  },
} as const;

function viewFilter(view: GoalListView) {
  switch (view) {
    case "current":
      return { archivedAt: null, status: { in: ["ACTIVE", "PAUSED"] as GoalStatus[] } };
    case "completed":
      return { archivedAt: null, status: "COMPLETED" as GoalStatus };
    case "archived":
      return { archivedAt: { not: null } };
  }
}

export const goalRepository = {
  /** The highest-priority active goal, used as the user's "major goal". */
  findMajorGoal(userId: string) {
    return db.goal.findFirst({
      where: { userId, status: "ACTIVE", archivedAt: null },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { milestones: roadmapSummarySelect },
    });
  },

  countActive(userId: string) {
    return db.goal.count({ where: { userId, status: "ACTIVE", archivedAt: null } });
  },

  countByView(userId: string) {
    return Promise.all(
      (["current", "completed", "archived"] as const).map((view) =>
        db.goal.count({ where: { userId, ...viewFilter(view) } }),
      ),
    ).then(([current, completed, archived]) => ({ current, completed, archived }));
  },

  list(userId: string, view: GoalListView) {
    return db.goal.findMany({
      where: { userId, ...viewFilter(view) },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { milestones: roadmapSummarySelect },
    });
  },

  /** Full goal with its roadmap. Returns null for goals the user doesn't own. */
  findDetail(userId: string, goalId: string) {
    return db.goal.findFirst({
      where: { id: goalId, userId },
      include: {
        milestones: {
          orderBy: { order: "asc" },
          include: { missions: { orderBy: { order: "asc" } } },
        },
        roadmapRevisions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { source: true, generator: true, summary: true, createdAt: true },
        },
      },
    });
  },

  findOwned(userId: string, goalId: string) {
    return db.goal.findFirst({ where: { id: goalId, userId } });
  },
};
