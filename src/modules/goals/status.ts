import type { GoalStatus, StartingPoint } from "@/generated/prisma/enums";

export type GoalTransition = "pause" | "resume" | "complete" | "reopen";

/** Allowed lifecycle moves. Archiving is separate and allowed from any status. */
const TRANSITIONS: Record<GoalTransition, { from: readonly GoalStatus[]; to: GoalStatus }> = {
  pause: { from: ["ACTIVE"], to: "PAUSED" },
  resume: { from: ["PAUSED"], to: "ACTIVE" },
  complete: { from: ["ACTIVE", "PAUSED"], to: "COMPLETED" },
  reopen: { from: ["COMPLETED"], to: "ACTIVE" },
};

export const GOAL_TRANSITIONS = ["pause", "resume", "complete", "reopen"] as const satisfies readonly GoalTransition[];

export function canTransition(status: GoalStatus, transition: GoalTransition): boolean {
  return TRANSITIONS[transition].from.includes(status);
}

/**
 * The field changes a transition implies. Deterministic and timestamped by
 * the caller so it stays testable.
 */
export function applyTransition(
  status: GoalStatus,
  transition: GoalTransition,
  now: Date,
): { status: GoalStatus; pausedAt?: Date | null; completedAt?: Date | null } {
  if (!canTransition(status, transition)) {
    throw new Error(`Cannot ${transition} a goal that is ${status.toLowerCase()}`);
  }
  switch (transition) {
    case "pause":
      return { status: "PAUSED", pausedAt: now };
    case "resume":
      return { status: "ACTIVE", pausedAt: null };
    case "complete":
      return { status: "COMPLETED", completedAt: now, pausedAt: null };
    case "reopen":
      return { status: "ACTIVE", completedAt: null };
  }
}

export const GOAL_STATUS_META: Record<GoalStatus, { label: string }> = {
  ACTIVE: { label: "Active" },
  PAUSED: { label: "Paused" },
  COMPLETED: { label: "Completed" },
};

export const STARTING_POINT_OPTIONS = [
  { key: "NEW", label: "Brand new", description: "Starting from the beginning." },
  { key: "SOME_EXPERIENCE", label: "Some experience", description: "I know the basics already." },
  { key: "EXPERIENCED", label: "Experienced", description: "Skip the foundations — I want to go further." },
] as const satisfies readonly { key: StartingPoint; label: string; description: string }[];

/** Soft limit: above this, AROHA suggests focusing (spec §39). */
export const RECOMMENDED_MAX_ACTIVE_GOALS = 5;
