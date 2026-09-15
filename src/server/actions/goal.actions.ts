"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validationFailure, type ActionResult } from "@/lib/action-result";
import {
  createGoalSchema,
  goalInputSchema,
  goalTransitionSchema,
  idSchema,
  milestoneManualStatusSchema,
  missionStatusSchema,
  moveSchema,
  roadmapItemSchema,
} from "@/modules/goals/schemas";
import { getCurrentUser } from "@/server/auth/current-user";
import * as goals from "@/server/services/goal.service";

// Server Functions receive untrusted network input: everything is re-parsed.

async function run(task: (userId: string) => Promise<unknown>, message?: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    await task(user.id);
  } catch (error) {
    if (error instanceof goals.GoalError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  // Goals surface on /goals, goal pages, Home and Character.
  revalidatePath("/", "layout");
  return { ok: true, message };
}

function goalFormValues(formData: FormData) {
  return {
    title: formData.get("title") ?? "",
    lifeArea: formData.get("lifeArea") ?? undefined,
    motivation: formData.get("motivation") ?? "",
    target: formData.get("target") ?? "",
    description: formData.get("description") ?? "",
    startingPoint: formData.get("startingPoint") ?? undefined,
    deadline: formData.get("deadline") ?? "",
  };
}

export async function createGoalAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = createGoalSchema.safeParse({
    ...goalFormValues(formData),
    generateRoadmap: formData.get("generateRoadmap") === "on",
  });
  if (!parsed.success) return validationFailure(parsed.error);

  let goalId: string | null = null;
  const result = await run(async (userId) => {
    goalId = (await goals.createGoal(userId, parsed.data)).id;
  });
  if (!result.ok || !goalId) return result;
  redirect(`/goals/${goalId}`);
}

export async function updateGoalAction(
  goalId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = idSchema.safeParse(goalId);
  if (!id.success) return validationFailure(id.error);
  const parsed = goalInputSchema.safeParse(goalFormValues(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  const result = await run((userId) => goals.updateGoal(userId, id.data, parsed.data));
  if (!result.ok) return result;
  redirect(`/goals/${id.data}`);
}

export async function transitionGoalAction(input: unknown): Promise<ActionResult> {
  const parsed = goalTransitionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const messages = { pause: "Goal paused", resume: "Goal resumed", complete: "Goal completed", reopen: "Goal reopened" };
  return run(
    (userId) => goals.transitionGoal(userId, parsed.data.goalId, parsed.data.transition),
    messages[parsed.data.transition],
  );
}

export async function setGoalArchivedAction(goalId: unknown, archived: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(goalId);
  if (!id.success || typeof archived !== "boolean") return { ok: false, error: "Invalid request" };
  return run((userId) => goals.setArchived(userId, id.data, archived), archived ? "Goal archived" : "Goal restored");
}

export async function setMajorGoalAction(goalId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(goalId);
  if (!id.success) return validationFailure(id.error);
  return run((userId) => goals.setMajorGoal(userId, id.data), "Now your major goal");
}

export async function generateRoadmapAction(goalId: unknown, replace: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(goalId);
  if (!id.success) return validationFailure(id.error);
  return run(
    (userId) => goals.generateRoadmap(userId, id.data, { replace: replace === true }),
    "Roadmap generated",
  );
}

export async function addMilestoneAction(goalId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(goalId);
  const parsed = roadmapItemSchema.safeParse(input);
  if (!id.success) return validationFailure(id.error);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => goals.addMilestone(userId, id.data, parsed.data), "Milestone added");
}

export async function updateMilestoneAction(milestoneId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(milestoneId);
  const parsed = roadmapItemSchema.safeParse(input);
  if (!id.success) return validationFailure(id.error);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => goals.updateMilestone(userId, id.data, parsed.data), "Milestone updated");
}

export async function setMilestoneStatusAction(milestoneId: unknown, status: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(milestoneId);
  const parsed = milestoneManualStatusSchema.safeParse(status);
  if (!id.success) return validationFailure(id.error);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => goals.setMilestoneStatus(userId, id.data, parsed.data));
}

export async function moveMilestoneAction(input: unknown): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => goals.moveMilestone(userId, parsed.data.id, parsed.data.direction));
}

export async function deleteMilestoneAction(milestoneId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(milestoneId);
  if (!id.success) return validationFailure(id.error);
  return run((userId) => goals.deleteMilestone(userId, id.data), "Milestone deleted");
}

export async function addMissionAction(milestoneId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(milestoneId);
  const parsed = roadmapItemSchema.safeParse(input);
  if (!id.success) return validationFailure(id.error);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => goals.addMission(userId, id.data, parsed.data), "Mission added");
}

export async function updateMissionAction(missionId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(missionId);
  const parsed = roadmapItemSchema.safeParse(input);
  if (!id.success) return validationFailure(id.error);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => goals.updateMission(userId, id.data, parsed.data), "Mission updated");
}

export async function setMissionStatusAction(missionId: unknown, status: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(missionId);
  const parsed = missionStatusSchema.safeParse(status);
  if (!id.success) return validationFailure(id.error);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => goals.setMissionStatus(userId, id.data, parsed.data));
}

export async function moveMissionAction(input: unknown): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => goals.moveMission(userId, parsed.data.id, parsed.data.direction));
}

export async function deleteMissionAction(missionId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(missionId);
  if (!id.success) return validationFailure(id.error);
  return run((userId) => goals.deleteMission(userId, id.data), "Mission deleted");
}
