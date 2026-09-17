import type { AssessmentKind } from "@/generated/prisma/enums";

/**
 * Assessment definitions (spec §25). Plain data so the built-in catalogue,
 * the generic project assessment, and future AI-authored assessments all
 * share one shape. Attempts snapshot the definition they were taken against.
 */

export type QuizQuestion = {
  prompt: string;
  options: readonly string[];
  /** Index into `options`. Never sent to the client before a pass. */
  answer: number;
  explanation: string;
};

export type RubricCriterion = {
  key: string;
  label: string;
  /** What a strong submission looks like for this criterion. */
  description: string;
  /** Relative importance, 1–3. */
  weight: number;
};

type BaseDefinition = {
  key: string;
  /** Stored (full) slug of the skill being assessed, e.g. "programming.fundamentals". */
  skillSlug: string;
  title: string;
  summary: string;
  minutes: number;
  /** Percent needed to pass. */
  passPercent: number;
};

export type QuizDefinition = BaseDefinition & {
  kind: Extract<AssessmentKind, "QUIZ">;
  questions: readonly QuizQuestion[];
};

export type PracticalDefinition = BaseDefinition & {
  kind: Extract<AssessmentKind, "PRACTICAL">;
  /** The task, in the user's language. */
  brief: string;
  /** What to hand in. */
  deliverable: string;
  criteria: readonly RubricCriterion[];
};

export type ProjectAssessmentDefinition = BaseDefinition & {
  kind: Extract<AssessmentKind, "PROJECT">;
  brief: string;
  criteria: readonly RubricCriterion[];
};

export type AssessmentDefinition = QuizDefinition | PracticalDefinition | ProjectAssessmentDefinition;
export type RubricDefinition = PracticalDefinition | ProjectAssessmentDefinition;

/** Rubric ratings run 0–4. */
export const RUBRIC_MAX = 4;

export const RUBRIC_SCALE = [
  { value: 0, label: "Not there yet" },
  { value: 1, label: "Started" },
  { value: 2, label: "Partly" },
  { value: 3, label: "Solid" },
  { value: 4, label: "Excellent" },
] as const;

export type CriterionFeedback = { key: string; label: string; score: number; note: string };
export type QuestionFeedback = { index: number; correct: boolean };

export type AssessmentFeedback = {
  summary: string;
  nextStep: string;
  criteria?: CriterionFeedback[];
  questions?: QuestionFeedback[];
};
