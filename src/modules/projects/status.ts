import type { ProjectStatus } from "@/generated/prisma/enums";

/**
 * Project lifecycle rules. Pure and shared by the service (enforcement) and
 * the UI (which buttons to show).
 */

export const PROJECT_TRANSITIONS = ["start", "pause", "resume", "complete", "reopen"] as const;
export type ProjectTransition = (typeof PROJECT_TRANSITIONS)[number];

const ALLOWED: Record<ProjectTransition, readonly ProjectStatus[]> = {
  start: ["PLANNING"],
  pause: ["IN_PROGRESS"],
  resume: ["PAUSED"],
  complete: ["PLANNING", "IN_PROGRESS", "PAUSED"],
  reopen: ["COMPLETED"],
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In progress",
  PAUSED: "Paused",
  COMPLETED: "Completed",
};

export function canTransitionProject(status: ProjectStatus, transition: ProjectTransition): boolean {
  return ALLOWED[transition].includes(status);
}

export function nextProjectStatus(transition: ProjectTransition): ProjectStatus {
  switch (transition) {
    case "start":
    case "resume":
    case "reopen":
      return "IN_PROGRESS";
    case "pause":
      return "PAUSED";
    case "complete":
      return "COMPLETED";
  }
}

/** Why a project can't be completed yet, or null when it can. Proof > claims. */
export function completionBlocker(project: { evidenceCount: number; skillCount: number }): string | null {
  if (project.evidenceCount === 0) return "Add at least one piece of evidence — a link, file or write-up of what you made.";
  if (project.skillCount === 0) return "Choose at least one skill this project used.";
  return null;
}

/** Limits that keep projects focused. */
export const MAX_PROJECT_SKILLS = 6;
export const MAX_PROJECT_MILESTONES = 20;
export const MAX_PROJECT_EVIDENCE = 20;
