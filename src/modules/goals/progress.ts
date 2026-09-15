import type { GoalStatus, MilestoneStatus } from "@/generated/prisma/enums";

export type MissionState = { id: string; title: string; status: MilestoneStatus };
export type MilestoneState = {
  id: string;
  title: string;
  status: MilestoneStatus;
  missions: MissionState[];
};

const isDone = (status: MilestoneStatus) => status === "COMPLETED" || status === "SKIPPED";

/**
 * A milestone with missions takes its status from them:
 * all done (with at least one completed) → COMPLETED; all skipped → SKIPPED;
 * any progress → IN_PROGRESS; otherwise PENDING.
 * A milestone without missions keeps whatever the user set.
 */
export function deriveMilestoneStatus(
  current: MilestoneStatus,
  missionStatuses: readonly MilestoneStatus[],
): MilestoneStatus {
  if (missionStatuses.length === 0) return current;
  if (missionStatuses.every((s) => s === "SKIPPED")) return "SKIPPED";
  if (missionStatuses.every(isDone)) return "COMPLETED";
  if (missionStatuses.some(isDone)) return "IN_PROGRESS";
  return "PENDING";
}

export type RoadmapProgress = {
  totalMilestones: number;
  completedMilestones: number;
  totalMissions: number;
  completedMissions: number;
  skippedMissions: number;
  /** 0–100. Skipped work is excluded from the denominator. */
  percent: number;
  /** True when every countable mission (or milestone) is done. */
  roadmapDone: boolean;
};

export function computeRoadmapProgress(milestones: readonly MilestoneState[]): RoadmapProgress {
  const missions = milestones.flatMap((m) => m.missions);
  const completedMissions = missions.filter((m) => m.status === "COMPLETED").length;
  const skippedMissions = missions.filter((m) => m.status === "SKIPPED").length;
  const countableMissions = missions.length - skippedMissions;

  const completedMilestones = milestones.filter((m) => m.status === "COMPLETED").length;
  const countableMilestones = milestones.filter((m) => m.status !== "SKIPPED").length;

  let percent = 0;
  let roadmapDone = false;
  if (countableMissions > 0) {
    percent = Math.floor((completedMissions / countableMissions) * 100);
    roadmapDone = completedMissions === countableMissions;
  } else if (countableMilestones > 0) {
    percent = Math.floor((completedMilestones / countableMilestones) * 100);
    roadmapDone = completedMilestones === countableMilestones;
  }

  return {
    totalMilestones: milestones.length,
    completedMilestones,
    totalMissions: missions.length,
    completedMissions,
    skippedMissions,
    percent,
    roadmapDone,
  };
}

/** Completed goals read as 100% regardless of leftover roadmap items. */
export function goalPercent(status: GoalStatus, progress: RoadmapProgress): number {
  return status === "COMPLETED" ? 100 : progress.percent;
}

/**
 * The next concrete step: the first pending mission in the first unfinished
 * milestone. This is what the Daily Quest system will turn into today's
 * Personal Goal quest.
 */
export function nextStep(milestones: readonly MilestoneState[]):
  | { milestone: { id: string; title: string }; mission: { id: string; title: string } | null }
  | null {
  for (const milestone of milestones) {
    if (isDone(milestone.status)) continue;
    const mission = milestone.missions.find((m) => m.status === "PENDING") ?? null;
    if (milestone.missions.length > 0 && !mission) continue;
    return {
      milestone: { id: milestone.id, title: milestone.title },
      mission: mission ? { id: mission.id, title: mission.title } : null,
    };
  }
  return null;
}
