import "server-only";

import type { UnlockedAchievement } from "@/modules/achievements/catalogue";
import { PROJECT_CATEGORIES } from "@/modules/projects/categories";
import { projectSkillXp, projectXpReward } from "@/modules/projects/rewards";
import type { EvidenceInput, ProjectInput } from "@/modules/projects/schemas";
import {
  canTransitionProject,
  completionBlocker,
  MAX_PROJECT_EVIDENCE,
  MAX_PROJECT_MILESTONES,
  nextProjectStatus,
  type ProjectTransition,
} from "@/modules/projects/status";
import { awardXp, revokeXp } from "@/server/progression/engine";
import { projectRepository } from "@/server/repositories/project.repository";
import { skillRepository } from "@/server/repositories/skill.repository";
import { checkAchievements } from "@/server/services/achievement.service";
import { awardSkills, ensureSkillCatalogue, revokeSkillAwards, type DirectSkillOutcome } from "@/server/services/skill.service";

/**
 * Projects (spec §19): real things the user makes. A project can only be
 * completed with evidence attached, and completion is where it pays — XP to
 * the character and to every skill it used, priced by the backend.
 * Reopening a project takes that back exactly; the evidence stays.
 */

export class ProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectError";
  }
}

async function requireProject(userId: string, projectId: string) {
  const project = await projectRepository.findOwned(userId, projectId);
  if (!project) throw new ProjectError("That project doesn't exist");
  return project;
}

async function validSkillIds(skillIds: string[]): Promise<string[]> {
  if (skillIds.length === 0) return [];
  await ensureSkillCatalogue();
  const found = await skillRepository.findSkills(skillIds);
  if (found.length !== skillIds.length) throw new ProjectError("One of those skills doesn't exist");
  return skillIds;
}

export async function listProjects(userId: string) {
  return projectRepository.list(userId);
}

export async function getProject(userId: string, projectId: string) {
  return projectRepository.findOwned(userId, projectId);
}

/** Skills grouped by tree, for the project skill picker. */
export async function listSkillOptions() {
  await ensureSkillCatalogue();
  const skills = await skillRepository.listAllSkills();
  const trees = new Map<string, { slug: string; name: string; emoji: string; skills: { id: string; name: string; nested: boolean }[] }>();
  for (const skill of skills) {
    const tree = trees.get(skill.tree.slug) ?? { ...skill.tree, skills: [] };
    tree.skills.push({ id: skill.id, name: skill.name, nested: skill.parentId !== null });
    trees.set(skill.tree.slug, tree);
  }
  return [...trees.values()];
}
export type SkillOptionTree = Awaited<ReturnType<typeof listSkillOptions>>[number];

export async function createProject(userId: string, input: ProjectInput) {
  const skillIds = await validSkillIds(input.skillIds);
  return projectRepository.create(
    userId,
    { title: input.title, description: input.description, category: input.category, reflection: input.reflection },
    skillIds,
    input.milestones,
  );
}

export async function updateProject(userId: string, projectId: string, input: ProjectInput) {
  const project = await requireProject(userId, projectId);
  const skillIds = await validSkillIds(input.skillIds);
  if (project.status === "COMPLETED" && skillIds.length === 0) {
    throw new ProjectError("A completed project needs at least one skill");
  }
  await projectRepository.update(
    projectId,
    { title: input.title, description: input.description, category: input.category, reflection: input.reflection },
    skillIds,
  );
}

export type ProjectCompletionOutcome = {
  xpAwarded: number;
  skills: DirectSkillOutcome[];
  achievements: UnlockedAchievement[];
};

export async function transitionProject(
  userId: string,
  projectId: string,
  transition: ProjectTransition,
): Promise<ProjectCompletionOutcome | null> {
  const project = await requireProject(userId, projectId);
  if (!canTransitionProject(project.status, transition)) {
    throw new ProjectError(`You can't ${transition} a project that is ${project.status.toLowerCase().replace("_", " ")}`);
  }

  if (transition === "complete") {
    const blocker = completionBlocker({ evidenceCount: project.evidence.length, skillCount: project.skills.length });
    if (blocker) throw new ProjectError(blocker);

    const now = new Date();
    const xp = projectXpReward(project.milestones.filter((m) => m.completedAt).length, project.evidence.length);
    const reason = `Project complete: ${project.title}`;
    const outcome = await awardXp({
      userId,
      amount: xp,
      sourceType: "PROJECT_COMPLETION",
      sourceId: project.id,
      lifeArea: PROJECT_CATEGORIES[project.category].lifeArea,
      reason,
    });
    const skills = await awardSkills(
      userId,
      { sourceType: "PROJECT_COMPLETION", sourceId: project.id, reason },
      project.skills.map(({ skill }) => ({ skillId: skill.id, amount: projectSkillXp(skill.baseXp) })),
    );
    await projectRepository.setStatus(projectId, {
      status: "COMPLETED",
      startedAt: project.startedAt ?? now,
      completedAt: now,
      xpAwarded: outcome.xpAwarded,
    });

    let achievements: UnlockedAchievement[] = [];
    try {
      achievements = await checkAchievements(userId);
    } catch (error) {
      console.error("Achievement check failed after project completion", projectId, error);
    }
    return { xpAwarded: outcome.xpAwarded, skills, achievements };
  }

  if (transition === "reopen") {
    // Completion paid for a finished thing; reopening un-finishes it.
    await revokeXp(userId, "PROJECT_COMPLETION", project.id);
    await revokeSkillAwards(userId, "PROJECT_COMPLETION", project.id);
    await projectRepository.setStatus(projectId, { status: "IN_PROGRESS", completedAt: null, xpAwarded: 0 });
    return null;
  }

  await projectRepository.setStatus(projectId, {
    status: nextProjectStatus(transition),
    startedAt: project.startedAt ?? new Date(),
    completedAt: null,
  });
  return null;
}

// ─── Milestones ──────────────────────────────────────────────────────────────

export async function addProjectMilestone(userId: string, projectId: string, title: string) {
  const project = await requireProject(userId, projectId);
  if (project.milestones.length >= MAX_PROJECT_MILESTONES) {
    throw new ProjectError(`A project can have up to ${MAX_PROJECT_MILESTONES} milestones`);
  }
  const order = project.milestones.reduce((max, m) => Math.max(max, m.order + 1), 0);
  return projectRepository.addMilestone(projectId, title, order);
}

export async function setProjectMilestoneDone(userId: string, milestoneId: string, done: boolean) {
  const milestone = await projectRepository.findMilestoneOwned(userId, milestoneId);
  if (!milestone) throw new ProjectError("That milestone doesn't exist");
  if (milestone.project.status === "COMPLETED") throw new ProjectError("Reopen the project to change its milestones");
  await projectRepository.setMilestoneDone(milestoneId, done);
  await projectRepository.touch(milestone.project.id);
}

export async function deleteProjectMilestone(userId: string, milestoneId: string) {
  const milestone = await projectRepository.findMilestoneOwned(userId, milestoneId);
  if (!milestone) throw new ProjectError("That milestone doesn't exist");
  if (milestone.project.status === "COMPLETED") throw new ProjectError("Reopen the project to change its milestones");
  await projectRepository.deleteMilestone(milestoneId);
}

// ─── Evidence ────────────────────────────────────────────────────────────────

export async function addEvidence(userId: string, input: EvidenceInput) {
  const project = await requireProject(userId, input.projectId);
  if (project.evidence.length >= MAX_PROJECT_EVIDENCE) {
    throw new ProjectError(`A project can hold up to ${MAX_PROJECT_EVIDENCE} pieces of evidence`);
  }
  const evidence = await projectRepository.addEvidence(userId, project.id, {
    kind: input.kind,
    title: input.title,
    url: input.url,
    note: input.note,
  });
  await projectRepository.touch(project.id);
  return evidence;
}

export async function deleteEvidence(userId: string, evidenceId: string) {
  const evidence = await projectRepository.findEvidenceOwned(userId, evidenceId);
  if (!evidence || !evidence.project) throw new ProjectError("That evidence doesn't exist");
  if (evidence.project.status === "COMPLETED" && evidence.project._count.evidence <= 1) {
    throw new ProjectError("A completed project keeps at least one piece of evidence — add another before removing this");
  }
  await projectRepository.deleteEvidence(evidenceId);
}
