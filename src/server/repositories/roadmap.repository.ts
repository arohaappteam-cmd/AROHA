import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ContentSource, MilestoneStatus } from "@/generated/prisma/enums";
import { deriveMilestoneStatus } from "@/modules/goals/progress";
import type { RoadmapDraft } from "@/modules/goals/roadmap";
import { db } from "@/server/db";

type Tx = Prisma.TransactionClient;

/** Ownership lookups: every roadmap write starts by proving the user owns it. */
export const roadmapRepository = {
  findMilestoneOwned(userId: string, milestoneId: string) {
    return db.milestone.findFirst({
      where: { id: milestoneId, goal: { userId } },
      include: { goal: { select: { id: true, archivedAt: true } }, _count: { select: { missions: true } } },
    });
  },

  findMissionOwned(userId: string, missionId: string) {
    return db.mission.findFirst({
      where: { id: missionId, goal: { userId } },
      include: { goal: { select: { id: true, archivedAt: true } } },
    });
  },

  /** Replaces the whole roadmap with a validated draft and records a revision. */
  replaceWithDraft(goalId: string, draft: RoadmapDraft, source: ContentSource, generator: string) {
    return db.$transaction(async (tx) => {
      await tx.milestone.deleteMany({ where: { goalId } });
      for (const [index, milestone] of draft.milestones.entries()) {
        await tx.milestone.create({
          data: {
            goalId,
            title: milestone.title,
            description: milestone.description,
            order: index,
            source,
            missions: {
              create: milestone.missions.map((mission, missionIndex) => ({
                goalId,
                title: mission.title,
                description: mission.description,
                order: missionIndex,
                source,
              })),
            },
          },
        });
      }
      await tx.roadmapRevision.create({
        data: { goalId, source, generator, summary: draft.summary, snapshot: draft },
      });
    });
  },

  createMilestone(goalId: string, data: { title: string; description: string | null }) {
    return db.$transaction(async (tx) => {
      const order = await tx.milestone.count({ where: { goalId } });
      return tx.milestone.create({ data: { goalId, ...data, order, source: "USER" } });
    });
  },

  updateMilestone(milestoneId: string, data: { title: string; description: string | null }) {
    return db.milestone.update({ where: { id: milestoneId }, data });
  },

  setMilestoneStatus(milestoneId: string, status: MilestoneStatus) {
    return db.milestone.update({
      where: { id: milestoneId },
      data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
    });
  },

  moveMilestone(goalId: string, milestoneId: string, direction: -1 | 1) {
    return db.$transaction(async (tx) => {
      const siblings = await tx.milestone.findMany({ where: { goalId }, orderBy: { order: "asc" }, select: { id: true } });
      await writeOrder(tx, "milestone", moveInList(siblings.map((s) => s.id), milestoneId, direction));
    });
  },

  deleteMilestone(goalId: string, milestoneId: string) {
    return db.$transaction(async (tx) => {
      await tx.milestone.delete({ where: { id: milestoneId } });
      const rest = await tx.milestone.findMany({ where: { goalId }, orderBy: { order: "asc" }, select: { id: true } });
      await writeOrder(tx, "milestone", rest.map((s) => s.id));
    });
  },

  createMission(goalId: string, milestoneId: string, data: { title: string; description: string | null }) {
    return db.$transaction(async (tx) => {
      const order = await tx.mission.count({ where: { milestoneId } });
      const mission = await tx.mission.create({ data: { goalId, milestoneId, ...data, order, source: "USER" } });
      await syncMilestoneStatus(tx, milestoneId);
      return mission;
    });
  },

  updateMission(missionId: string, data: { title: string; description: string | null }) {
    return db.mission.update({ where: { id: missionId }, data });
  },

  setMissionStatus(missionId: string, milestoneId: string, status: MilestoneStatus) {
    return db.$transaction(async (tx) => {
      await tx.mission.update({
        where: { id: missionId },
        data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
      });
      await syncMilestoneStatus(tx, milestoneId);
    });
  },

  moveMission(milestoneId: string, missionId: string, direction: -1 | 1) {
    return db.$transaction(async (tx) => {
      const siblings = await tx.mission.findMany({ where: { milestoneId }, orderBy: { order: "asc" }, select: { id: true } });
      await writeOrder(tx, "mission", moveInList(siblings.map((s) => s.id), missionId, direction));
    });
  },

  deleteMission(milestoneId: string, missionId: string) {
    return db.$transaction(async (tx) => {
      await tx.mission.delete({ where: { id: missionId } });
      const rest = await tx.mission.findMany({ where: { milestoneId }, orderBy: { order: "asc" }, select: { id: true } });
      await writeOrder(tx, "mission", rest.map((s) => s.id));
      await syncMilestoneStatus(tx, milestoneId);
    });
  },
};

export function moveInList(ids: string[], id: string, direction: -1 | 1): string[] {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

async function writeOrder(tx: Tx, model: "milestone" | "mission", ids: string[]) {
  for (const [order, id] of ids.entries()) {
    if (model === "milestone") await tx.milestone.update({ where: { id }, data: { order } });
    else await tx.mission.update({ where: { id }, data: { order } });
  }
}

/** Keeps a milestone's stored status consistent with its missions. */
async function syncMilestoneStatus(tx: Tx, milestoneId: string) {
  const milestone = await tx.milestone.findUniqueOrThrow({
    where: { id: milestoneId },
    select: { status: true, completedAt: true, missions: { select: { status: true } } },
  });
  // IN_PROGRESS only makes sense with missions; a milestone that lost its last
  // mission mid-way falls back to pending.
  const base = milestone.status === "IN_PROGRESS" ? "PENDING" : milestone.status;
  const status = deriveMilestoneStatus(base, milestone.missions.map((m) => m.status));
  if (status === milestone.status) return;
  await tx.milestone.update({
    where: { id: milestoneId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? (milestone.completedAt ?? new Date()) : null,
    },
  });
}
