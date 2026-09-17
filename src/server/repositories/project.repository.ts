import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { EvidenceKind, ProjectCategory, ProjectStatus } from "@/generated/prisma/enums";
import { db } from "@/server/db";

/**
 * Data access for projects, their milestones and evidence. Ownership is
 * always checked through `userId` on the project.
 */

const projectInclude = {
  skills: {
    select: {
      skill: {
        select: { id: true, slug: true, name: true, baseXp: true, tree: { select: { slug: true, name: true, emoji: true } } },
      },
    },
  },
  milestones: { orderBy: { order: "asc" as const } },
  evidence: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.ProjectInclude;

export type ProjectWithRelations = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export const projectRepository = {
  list(userId: string): Promise<ProjectWithRelations[]> {
    return db.project.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }],
      include: projectInclude,
    });
  },

  findOwned(userId: string, projectId: string): Promise<ProjectWithRelations | null> {
    return db.project.findFirst({ where: { id: projectId, userId }, include: projectInclude });
  },

  create(
    userId: string,
    data: { title: string; description: string | null; category: ProjectCategory; reflection: string | null },
    skillIds: string[],
    milestones: string[],
  ) {
    return db.project.create({
      data: {
        userId,
        ...data,
        skills: { create: skillIds.map((skillId) => ({ skillId })) },
        milestones: { create: milestones.map((title, order) => ({ title, order })) },
      },
    });
  },

  update(
    projectId: string,
    data: { title: string; description: string | null; category: ProjectCategory; reflection: string | null },
    skillIds: string[],
  ) {
    return db.$transaction([
      db.projectSkill.deleteMany({ where: { projectId, skillId: { notIn: skillIds } } }),
      db.projectSkill.createMany({ data: skillIds.map((skillId) => ({ projectId, skillId })), skipDuplicates: true }),
      db.project.update({ where: { id: projectId }, data }),
    ]);
  },

  setStatus(projectId: string, data: { status: ProjectStatus; startedAt?: Date; completedAt: Date | null; xpAwarded?: number }) {
    return db.project.update({ where: { id: projectId }, data });
  },

  addMilestone(projectId: string, title: string, order: number) {
    return db.projectMilestone.create({ data: { projectId, title, order } });
  },

  findMilestoneOwned(userId: string, milestoneId: string) {
    return db.projectMilestone.findFirst({
      where: { id: milestoneId, project: { userId } },
      include: { project: { select: { id: true, status: true } } },
    });
  },

  setMilestoneDone(milestoneId: string, done: boolean) {
    return db.projectMilestone.update({ where: { id: milestoneId }, data: { completedAt: done ? new Date() : null } });
  },

  deleteMilestone(milestoneId: string) {
    return db.projectMilestone.delete({ where: { id: milestoneId } });
  },

  addEvidence(userId: string, projectId: string, data: { kind: EvidenceKind; title: string; url: string | null; note: string | null }) {
    return db.evidence.create({ data: { userId, projectId, ...data } });
  },

  findEvidenceOwned(userId: string, evidenceId: string) {
    return db.evidence.findFirst({
      where: { id: evidenceId, userId },
      include: { project: { select: { id: true, status: true, _count: { select: { evidence: true } } } } },
    });
  },

  deleteEvidence(evidenceId: string) {
    return db.evidence.delete({ where: { id: evidenceId } });
  },

  touch(projectId: string) {
    return db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  },
};
