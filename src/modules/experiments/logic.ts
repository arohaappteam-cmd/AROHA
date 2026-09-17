import { z } from "zod";

import { ExperimentDecision, ExperimentImprovement, LifeArea } from "@/generated/prisma/enums";
import { daysBetween, formatDateOnly, parseDateOnly } from "@/modules/goals/dates";
import { MAX_AWARDABLE_XP } from "@/modules/progression/awards";
import { SKILL_TREES } from "@/modules/skills/catalogue";

import { customDailyIdeas, findExperimentTemplate } from "./catalogue";

/**
 * Experiment rules (spec §41). Deterministic, backend-owned, and gentle: an
 * experiment is a question ("do I like this?"), so there is no target to
 * miss — every practised day counts, and the review is what matters.
 */

export const EXPERIMENT_DURATION = { min: 3, max: 30 } as const;
export const MAX_ACTIVE_EXPERIMENTS = 2;
/** Experiment quests use these slots; slots are unique within a day. */
export const EXPERIMENT_SLOTS = ["EXPERIMENT", "EXPERIMENT_2"] as const;

export function isExperimentSlot(slot: string): boolean {
  return (EXPERIMENT_SLOTS as readonly string[]).includes(slot);
}

export function experimentEndDate(startDate: string, durationDays: number): string {
  return formatDateOnly(new Date(parseDateOnly(startDate).getTime() + (durationDays - 1) * 86_400_000));
}

/** 1-based day number within the window, or null outside it. */
export function experimentDayNumber(startDate: string, durationDays: number, today: string): number | null {
  const offset = daysBetween(startDate, today);
  return offset >= 0 && offset < durationDays ? offset + 1 : null;
}

/** True once the window has fully passed — time for the review. */
export function windowHasEnded(startDate: string, durationDays: number, today: string): boolean {
  return daysBetween(experimentEndDate(startDate, durationDays), today) > 0;
}

export type ExperimentProgress = {
  dayNumber: number | null;
  daysPracticed: number;
  daysLeft: number;
  endDate: string;
  /** Share of window days practised so far (0–100). */
  percent: number;
};

export function experimentProgress(
  experiment: { startDate: string; durationDays: number },
  daysPracticed: number,
  today: string,
): ExperimentProgress {
  const endDate = experimentEndDate(experiment.startDate, experiment.durationDays);
  return {
    dayNumber: experimentDayNumber(experiment.startDate, experiment.durationDays, today),
    daysPracticed,
    daysLeft: Math.max(0, daysBetween(today, endDate) + 1),
    endDate,
    percent: Math.min(100, Math.floor((daysPracticed / experiment.durationDays) * 100)),
  };
}

/** XP for finishing the review: curiosity rewarded per day actually tried. */
export function experimentXpReward(daysPracticed: number): number {
  return Math.min(MAX_AWARDABLE_XP, 150, Math.max(0, daysPracticed) * 10);
}

/** The skill tree a free-text topic most plausibly belongs to, if any. */
export function skillTreeForTopic(topic: string): string | null {
  return SKILL_TREES.find((tree) => tree.match.test(topic))?.slug ?? null;
}

/** Ideas the daily quest rotates through. */
export function ideasFor(experiment: { templateKey: string; topic: string }): readonly string[] {
  return findExperimentTemplate(experiment.templateKey)?.dailyIdeas ?? customDailyIdeas(experiment.topic);
}

/** Recorded template key: lets skill matching route the practice to its tree. */
export function experimentQuestTemplateKey(experiment: { skillTree: string | null }): string {
  return `experiment.${experiment.skillTree ?? "general"}`;
}

export type ExperimentQuestContent = {
  title: string;
  description: string;
  steps: string[];
  estimatedMinutes: number;
  rationale: string;
  templateKey: string;
};

export function experimentQuestContent(
  experiment: { title: string; topic: string; templateKey: string; skillTree: string | null; durationDays: number; dailyMinutes: number },
  dayNumber: number,
): ExperimentQuestContent {
  const ideas = ideasFor(experiment);
  const idea = ideas[(dayNumber - 1) % ideas.length];
  return {
    title: idea.slice(0, 120),
    description: `Day ${dayNumber} of ${experiment.durationDays} of your experiment: ${experiment.title.toLowerCase()}. About ${experiment.dailyMinutes} minutes — no pressure to be good at it.`.slice(0, 500),
    steps: ["Set a timer so it stays small", "Notice what you enjoy and what you don't", "Jot one line about how it went"],
    estimatedMinutes: experiment.dailyMinutes,
    rationale: `Part of your ${experiment.durationDays}-day experiment with ${experiment.topic}. Completing it counts as a practice day.`.slice(0, 240),
    templateKey: experimentQuestTemplateKey(experiment),
  };
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

export const startTemplateExperimentSchema = z.object({ templateKey: z.string().min(1).max(60) });

export const customExperimentSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(2, { error: "What do you want to try?" })
    .max(60, { error: "Keep it under 60 characters" }),
  durationDays: z.coerce
    .number()
    .int()
    .min(EXPERIMENT_DURATION.min, { error: `At least ${EXPERIMENT_DURATION.min} days` })
    .max(EXPERIMENT_DURATION.max, { error: `At most ${EXPERIMENT_DURATION.max} days` }),
  dailyMinutes: z.coerce.number().int().min(5, { error: "At least 5 minutes" }).max(120, { error: "At most 2 hours" }),
  lifeArea: z.enum(LifeArea, { error: "Choose a life area" }),
});
export type CustomExperimentInput = z.infer<typeof customExperimentSchema>;

const scale = z.coerce.number().int().min(1, { error: "Pick 1 to 5" }).max(5, { error: "Pick 1 to 5" });

export const experimentReviewSchema = z.object({
  experimentId: z.string().min(1).max(64),
  enjoyment: scale,
  interest: scale,
  improvement: z.enum(ExperimentImprovement, { error: "Did you improve?" }),
  decision: z.enum(ExperimentDecision, { error: "Choose what happens next" }),
  learned: z
    .string()
    .trim()
    .min(3, { error: "Write a line about what you learned" })
    .max(1500, { error: "Keep it under 1,500 characters" }),
});
export type ExperimentReviewInput = z.infer<typeof experimentReviewSchema>;

export const IMPROVEMENT_LABEL: Record<ExperimentImprovement, string> = {
  NOT_REALLY: "Not really",
  A_LITTLE: "A little",
  NOTICEABLY: "Noticeably",
  A_LOT: "A lot",
};

export const DECISION_META: Record<ExperimentDecision, { label: string; detail: string }> = {
  MAKE_IT_A_GOAL: { label: "Make it a goal", detail: "Turn this into a real goal with a roadmap." },
  KEEP_EXPLORING: { label: "Keep exploring", detail: "Not sure yet — try it a bit longer or differently." },
  NOT_FOR_NOW: { label: "Not for now", detail: "You tried it. Knowing that is worth something too." },
};

export const SCALE_LABELS: Record<"enjoyment" | "interest", readonly string[]> = {
  enjoyment: ["Not at all", "A little", "Somewhat", "Quite a lot", "Loved it"],
  interest: ["Bored", "Mildly", "Curious", "Interested", "Hooked"],
};
