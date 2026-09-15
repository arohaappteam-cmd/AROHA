import "server-only";

import type { ContentSource, MilestoneStatus } from "@/generated/prisma/enums";
import { parseDateOnly } from "@/modules/goals/dates";
import { roadmapDraftSchema, type RoadmapContext, type RoadmapGenerator } from "@/modules/goals/roadmap";
import type { GoalInput, RoadmapItemInput } from "@/modules/goals/schemas";
import { applyTransition, canTransition, type GoalTransition } from "@/modules/goals/status";
import { selectRoadmapGenerator } from "@/server/ai/roadmap-generator";
import { db } from "@/server/db";
import { goalRepository } from "@/server/repositories/goal.repository";
import { identityRepository } from "@/server/repositories/identity.repository";
import { roadmapRepository } from "@/server/repositories/roadmap.repository";

/** Business-rule failures that are safe to show to the user. */
export class GoalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalError";
  }
}

/**
 * The generator used for new roadmaps. AI-backed when configured, templates
 * otherwise; either way the output passes through the same validation.
 */
function roadmapGenerator(): RoadmapGenerator {
  return selectRoadmapGenerator();
}

function toGoalData(input: GoalInput) {
  return {
    title: input.title,
    lifeArea: input.lifeArea,
    motivation: input.motivation,
    target: input.target,
    description: input.description,
    startingPoint: input.startingPoint,
    deadline: input.deadline ? parseDateOnly(input.deadline) : null,
  };
}

async function requireGoal(userId: string, goalId: string, { writable = true } = {}) {
  const goal = await goalRepository.findOwned(userId, goalId);
  if (!goal) throw new GoalError("That goal doesn't exist");
  if (writable && goal.archivedAt) throw new GoalError("This goal is archived. Restore it to make changes.");
  return goal;
}

// ─── Goals ──────────────────────────────────────────────────────────────────

export async function createGoal(userId: string, input: GoalInput & { generateRoadmap: boolean }) {
  const existing = await db.goal.count({ where: { userId, archivedAt: null, status: { not: "COMPLETED" } } });
  const goal = await db.goal.create({
    data: {
      userId,
      ...toGoalData(input),
      // The first goal becomes the major goal; later ones queue behind it.
      priority: existing === 0 ? 0 : 1,
    },
  });
  if (input.generateRoadmap) {
    try {
      await generateRoadmap(userId, goal.id);
    } catch (error) {
      // The goal itself is saved; the roadmap can be generated again later.
      console.error("Roadmap generation failed", error);
    }
  }
  return goal;
}

export async function updateGoal(userId: string, goalId: string, input: GoalInput) {
  await requireGoal(userId, goalId);
  return db.goal.update({ where: { id: goalId }, data: toGoalData(input) });
}

export async function transitionGoal(userId: string, goalId: string, transition: GoalTransition) {
  const goal = await requireGoal(userId, goalId);
  if (!canTransition(goal.status, transition)) {
    throw new GoalError(`You can't ${transition} a goal that is ${goal.status.toLowerCase()}`);
  }
  return db.goal.update({ where: { id: goalId }, data: applyTransition(goal.status, transition, new Date()) });
}

export async function setArchived(userId: string, goalId: string, archived: boolean) {
  await requireGoal(userId, goalId, { writable: false });
  return db.goal.update({ where: { id: goalId }, data: { archivedAt: archived ? new Date() : null } });
}

/** Makes this goal the major goal; every other goal moves behind it. */
export async function setMajorGoal(userId: string, goalId: string) {
  const goal = await requireGoal(userId, goalId);
  if (goal.status !== "ACTIVE") throw new GoalError("Only active goals can be your major goal");
  await db.$transaction([
    db.goal.updateMany({ where: { userId, id: { not: goalId } }, data: { priority: 1 } }),
    db.goal.update({ where: { id: goalId }, data: { priority: 0 } }),
  ]);
}

// ─── Roadmap generation ─────────────────────────────────────────────────────

export async function generateRoadmap(userId: string, goalId: string, { replace = false } = {}) {
  const goal = await requireGoal(userId, goalId);
  const milestoneCount = await db.milestone.count({ where: { goalId } });
  if (milestoneCount > 0 && !replace) {
    throw new GoalError("This goal already has a roadmap");
  }

  const [preferences, interests] = await Promise.all([
    identityRepository.findPreferences(userId),
    identityRepository.listInterests(userId),
  ]);
  const context: RoadmapContext = {
    title: goal.title,
    description: goal.description,
    lifeArea: goal.lifeArea,
    motivation: goal.motivation,
    target: goal.target,
    startingPoint: goal.startingPoint,
    challengeLevel: preferences?.challengeLevel ?? "BALANCED",
    interests: interests.map((interest) => interest.label),
  };

  const generator = roadmapGenerator();
  const generated = await generator.generate(context);
  // Never trust a generator's output shape — AI or otherwise.
  const draft = roadmapDraftSchema.parse(generated.draft);
  const source: ContentSource = generated.generator.startsWith("rule-based") ? "TEMPLATE" : "AI";
  await roadmapRepository.replaceWithDraft(goalId, draft, source, generated.generator);
}

// ─── Milestones ─────────────────────────────────────────────────────────────

async function requireMilestone(userId: string, milestoneId: string) {
  const milestone = await roadmapRepository.findMilestoneOwned(userId, milestoneId);
  if (!milestone) throw new GoalError("That milestone doesn't exist");
  if (milestone.goal.archivedAt) throw new GoalError("This goal is archived. Restore it to make changes.");
  return milestone;
}

export async function addMilestone(userId: string, goalId: string, input: RoadmapItemInput) {
  await requireGoal(userId, goalId);
  const count = await db.milestone.count({ where: { goalId } });
  if (count >= 12) throw new GoalError("A roadmap can have up to 12 milestones");
  return roadmapRepository.createMilestone(goalId, input);
}

export async function updateMilestone(userId: string, milestoneId: string, input: RoadmapItemInput) {
  await requireMilestone(userId, milestoneId);
  return roadmapRepository.updateMilestone(milestoneId, input);
}

export async function setMilestoneStatus(userId: string, milestoneId: string, status: MilestoneStatus) {
  const milestone = await requireMilestone(userId, milestoneId);
  if (milestone._count.missions > 0) {
    throw new GoalError("This milestone's status follows its missions");
  }
  return roadmapRepository.setMilestoneStatus(milestoneId, status);
}

export async function moveMilestone(userId: string, milestoneId: string, direction: -1 | 1) {
  const milestone = await requireMilestone(userId, milestoneId);
  return roadmapRepository.moveMilestone(milestone.goal.id, milestoneId, direction);
}

export async function deleteMilestone(userId: string, milestoneId: string) {
  const milestone = await requireMilestone(userId, milestoneId);
  return roadmapRepository.deleteMilestone(milestone.goal.id, milestoneId);
}

// ─── Missions ───────────────────────────────────────────────────────────────

async function requireMission(userId: string, missionId: string) {
  const mission = await roadmapRepository.findMissionOwned(userId, missionId);
  if (!mission) throw new GoalError("That mission doesn't exist");
  if (mission.goal.archivedAt) throw new GoalError("This goal is archived. Restore it to make changes.");
  return mission;
}

export async function addMission(userId: string, milestoneId: string, input: RoadmapItemInput) {
  const milestone = await requireMilestone(userId, milestoneId);
  if (milestone._count.missions >= 12) throw new GoalError("A milestone can have up to 12 missions");
  return roadmapRepository.createMission(milestone.goal.id, milestoneId, input);
}

export async function updateMission(userId: string, missionId: string, input: RoadmapItemInput) {
  await requireMission(userId, missionId);
  return roadmapRepository.updateMission(missionId, input);
}

export async function setMissionStatus(userId: string, missionId: string, status: MilestoneStatus) {
  const mission = await requireMission(userId, missionId);
  return roadmapRepository.setMissionStatus(missionId, mission.milestoneId, status);
}

export async function moveMission(userId: string, missionId: string, direction: -1 | 1) {
  const mission = await requireMission(userId, missionId);
  return roadmapRepository.moveMission(mission.milestoneId, missionId, direction);
}

export async function deleteMission(userId: string, missionId: string) {
  const mission = await requireMission(userId, missionId);
  return roadmapRepository.deleteMission(mission.milestoneId, missionId);
}
