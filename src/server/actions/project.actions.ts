"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { validationFailure, type ActionResult, type ActionResultWith } from "@/lib/action-result";
import {
  evidenceInputSchema,
  idSchema,
  projectInputSchema,
  projectMilestoneSchema,
  projectTransitionSchema,
} from "@/modules/projects/schemas";
import { getCurrentUser } from "@/server/auth/current-user";
import * as projects from "@/server/services/project.service";

// Server Functions receive untrusted input: everything is re-parsed here.

async function run(task: (userId: string) => Promise<unknown>, message?: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    await task(user.id);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof projects.ProjectError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  // Projects surface on /projects, the passport, skills, character and Home.
  revalidatePath("/", "layout");
  return { ok: true, message };
}

export async function createProjectAction(input: unknown): Promise<ActionResult> {
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  let projectId: string | null = null;
  const result = await run(async (userId) => {
    projectId = (await projects.createProject(userId, parsed.data)).id;
  });
  if (!result.ok || !projectId) return result;
  redirect(`/projects/${projectId}`);
}

export async function updateProjectAction(projectId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(projectId);
  if (!id.success) return validationFailure(id.error);
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const result = await run((userId) => projects.updateProject(userId, id.data, parsed.data));
  if (!result.ok) return result;
  redirect(`/projects/${id.data}`);
}

export async function transitionProjectAction(input: unknown): Promise<ActionResultWith<projects.ProjectCompletionOutcome | null>> {
  const parsed = projectTransitionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const user = await getCurrentUser();
    const outcome = await projects.transitionProject(user.id, parsed.data.projectId, parsed.data.transition);
    revalidatePath("/", "layout");

    const messages = {
      start: "Project started",
      pause: "Project paused",
      resume: "Back to building",
      reopen: "Project reopened — its completion XP is set aside until you finish again",
      complete: "Project complete",
    };
    let message = messages[parsed.data.transition];
    if (outcome) {
      const notes = [
        outcome.xpAwarded > 0 ? `+${outcome.xpAwarded} XP` : null,
        ...outcome.skills.filter((s) => s.xpAwarded > 0).map((s) => `${s.name} +${s.xpAwarded}${s.leveledUp ? ` (level ${s.level})` : ""}`),
        ...outcome.achievements.map((a) => `Achievement: ${a.name}`),
      ].filter(Boolean);
      if (notes.length > 0) message = `${message} · ${notes.join(" · ")}`;
    }
    return { ok: true, message, data: outcome };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof projects.ProjectError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function addProjectMilestoneAction(input: unknown): Promise<ActionResult> {
  const parsed = projectMilestoneSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => projects.addProjectMilestone(userId, parsed.data.projectId, parsed.data.title), "Milestone added");
}

export async function setProjectMilestoneDoneAction(milestoneId: unknown, done: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(milestoneId);
  if (!id.success || typeof done !== "boolean") return { ok: false, error: "Invalid request" };
  return run((userId) => projects.setProjectMilestoneDone(userId, id.data, done));
}

export async function deleteProjectMilestoneAction(milestoneId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(milestoneId);
  if (!id.success) return validationFailure(id.error);
  return run((userId) => projects.deleteProjectMilestone(userId, id.data), "Milestone removed");
}

export async function addEvidenceAction(input: unknown): Promise<ActionResult> {
  const parsed = evidenceInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => projects.addEvidence(userId, parsed.data), "Evidence added");
}

export async function deleteEvidenceAction(evidenceId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(evidenceId);
  if (!id.success) return validationFailure(id.error);
  return run((userId) => projects.deleteEvidence(userId, id.data), "Evidence removed");
}
