import { z } from "zod";

import type { AssessmentEvaluator, AssessmentKind, AssessmentOutcome } from "@/generated/prisma/enums";
import { MAX_AWARDABLE_XP } from "@/modules/progression/awards";

import {
  RUBRIC_MAX,
  type AssessmentDefinition,
  type AssessmentFeedback,
  type QuizDefinition,
  type RubricDefinition,
} from "./types";

/**
 * Deterministic assessment rules (spec §6, §25). Whoever produces scores —
 * an answer key, the AI, or the user's own rubric ratings — pass/fail is
 * always decided here, by the same thresholds.
 */

export type Evaluation = {
  score: number;
  maxScore: number;
  percent: number;
  outcome: AssessmentOutcome;
  evaluator: AssessmentEvaluator;
  feedback: AssessmentFeedback;
};

/** A written response must say something real before it can be evaluated. */
export const MIN_RESPONSE_LENGTH = 80;

function percentOf(score: number, maxScore: number): number {
  return maxScore === 0 ? 0 : Math.floor((score / maxScore) * 100);
}

// ─── Quizzes ─────────────────────────────────────────────────────────────────

export function gradeQuiz(definition: QuizDefinition, answers: readonly number[]): Evaluation {
  const questions = definition.questions.map((question, index) => ({ index, correct: answers[index] === question.answer }));
  const score = questions.filter((q) => q.correct).length;
  const maxScore = definition.questions.length;
  const percent = percentOf(score, maxScore);
  const passed = percent >= definition.passPercent;
  const missed = maxScore - score;

  return {
    score,
    maxScore,
    percent,
    outcome: passed ? "PASSED" : "NOT_YET",
    evaluator: "AUTO_GRADED",
    feedback: {
      summary: passed
        ? `${score} of ${maxScore} correct — your understanding checks out.`
        : `${score} of ${maxScore} correct. Not yet — ${missed} question${missed === 1 ? "" : "s"} to revisit.`,
      nextStep: passed
        ? "Understanding is the start. A practical task or a project shows you can use it."
        : "Review the questions you missed, practise a little, and take it again whenever you're ready.",
      questions,
    },
  };
}

// ─── Rubrics (practical + project) ───────────────────────────────────────────

export type RubricRatings = Record<string, number>;

export function scoreRubric(definition: RubricDefinition, ratings: RubricRatings): { score: number; maxScore: number; percent: number } {
  let score = 0;
  let maxScore = 0;
  for (const criterion of definition.criteria) {
    const raw = ratings[criterion.key];
    const value = Number.isInteger(raw) ? Math.min(RUBRIC_MAX, Math.max(0, raw)) : 0;
    score += value * criterion.weight;
    maxScore += RUBRIC_MAX * criterion.weight;
  }
  return { score, maxScore, percent: percentOf(score, maxScore) };
}

/** True when every criterion has an integer rating in range. */
export function ratingsComplete(definition: RubricDefinition, ratings: RubricRatings): boolean {
  return definition.criteria.every((criterion) => {
    const value = ratings[criterion.key];
    return Number.isInteger(value) && value >= 0 && value <= RUBRIC_MAX;
  });
}

function rubricEvaluation(
  definition: RubricDefinition,
  ratings: RubricRatings,
  evaluator: AssessmentEvaluator,
  notes: Record<string, string>,
  text: { summary?: string; nextStep?: string },
): Evaluation {
  const { score, maxScore, percent } = scoreRubric(definition, ratings);
  const passed = percent >= definition.passPercent;
  const weakest = [...definition.criteria].sort((a, b) => (ratings[a.key] ?? 0) - (ratings[b.key] ?? 0))[0];

  return {
    score,
    maxScore,
    percent,
    outcome: passed ? "PASSED" : "NOT_YET",
    evaluator,
    feedback: {
      summary:
        text.summary ??
        (passed ? `${percent}% against the rubric — demonstrated.` : `${percent}% against the rubric. Not yet — ${definition.passPercent}% passes.`),
      nextStep:
        text.nextStep ??
        (passed
          ? "Keep building. Harder projects in this skill will show how far it goes."
          : `Strengthen “${weakest?.label ?? "the weakest area"}” and submit again whenever you're ready.`),
      criteria: definition.criteria.map((criterion) => ({
        key: criterion.key,
        label: criterion.label,
        score: ratings[criterion.key] ?? 0,
        note: notes[criterion.key] ?? "",
      })),
    },
  };
}

/** The user's own ratings, used when AI review isn't available. Labelled as such everywhere. */
export function selfReviewEvaluation(definition: RubricDefinition, ratings: RubricRatings): Evaluation {
  return rubricEvaluation(definition, ratings, "SELF_REVIEW", {}, {});
}

/** The contract an AI evaluator must satisfy. It scores; it never decides. */
export const aiEvaluationSchema = z.object({
  criteria: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        score: z.number().int().min(0).max(RUBRIC_MAX),
        note: z.string().max(400),
      }),
    )
    .min(1)
    .max(12),
  summary: z.string().min(1).max(500),
  nextStep: z.string().min(1).max(300),
});
export type AIEvaluation = z.infer<typeof aiEvaluationSchema>;

/**
 * Turns validated AI scores into an evaluation. Returns null when the AI
 * didn't score exactly the rubric's criteria — the caller then falls back.
 */
export function aiRubricEvaluation(definition: RubricDefinition, output: AIEvaluation): Evaluation | null {
  const expected = new Set(definition.criteria.map((criterion) => criterion.key));
  const scored = new Map(output.criteria.map((criterion) => [criterion.key, criterion]));
  if (scored.size !== expected.size || [...expected].some((key) => !scored.has(key))) return null;

  const ratings = Object.fromEntries([...scored].map(([key, value]) => [key, value.score]));
  const notes = Object.fromEntries([...scored].map(([key, value]) => [key, value.note]));
  const evaluation = rubricEvaluation(definition, ratings, "AI", notes, {});
  // The AI's words, the backend's verdict: keep the summary honest about the outcome.
  evaluation.feedback.summary = `${evaluation.outcome === "PASSED" ? "Passed" : "Not yet"} (${evaluation.percent}%). ${output.summary}`;
  evaluation.feedback.nextStep = output.nextStep;
  return evaluation;
}

// ─── Rewards and meaning ─────────────────────────────────────────────────────

const CHARACTER_XP: Record<AssessmentKind, number> = { QUIZ: 40, PRACTICAL: 80, PROJECT: 120 };
const SKILL_MULTIPLIER: Record<AssessmentKind, number> = { QUIZ: 0.5, PRACTICAL: 1, PROJECT: 1.5 };

/** XP for a first pass. Retakes and later passes of the same assessment pay nothing. */
export function assessmentRewards(kind: AssessmentKind, skillBaseXp: number): { xp: number; skillXp: number } {
  return {
    xp: Math.min(MAX_AWARDABLE_XP, CHARACTER_XP[kind]),
    skillXp: Math.min(MAX_AWARDABLE_XP, Math.max(10, Math.round(skillBaseXp * SKILL_MULTIPLIER[kind]))),
  };
}

/**
 * Only demonstrations of ability can confirm mastery. Quizzes show
 * understanding; lessons and quests show practice. Neither is mastery.
 */
export function confirmsAbility(kind: AssessmentKind): boolean {
  return kind === "PRACTICAL" || kind === "PROJECT";
}

export const ASSESSMENT_KIND_LABEL: Record<AssessmentKind, string> = {
  QUIZ: "Quiz",
  PRACTICAL: "Practical task",
  PROJECT: "Project review",
};

export const EVALUATOR_LABEL: Record<AssessmentEvaluator, string> = {
  AUTO_GRADED: "Auto-graded",
  AI: "AI-reviewed",
  SELF_REVIEW: "Self-reviewed",
};

/**
 * What the client may see before an attempt: quiz answers and explanations
 * are stripped so they can't be read from the page.
 */
export type PublicQuizQuestion = { prompt: string; options: readonly string[] };

export function publicDefinition(definition: AssessmentDefinition) {
  if (definition.kind !== "QUIZ") return definition;
  const { questions, ...rest } = definition;
  return { ...rest, questions: questions.map(({ prompt, options }): PublicQuizQuestion => ({ prompt, options })) };
}
export type PublicAssessmentDefinition = ReturnType<typeof publicDefinition>;
