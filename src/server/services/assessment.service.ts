import "server-only";

import type { AssessmentKind, AssessmentOutcome, AssessmentEvaluator } from "@/generated/prisma/enums";
import type { UnlockedAchievement } from "@/modules/achievements/catalogue";
import {
  ASSESSMENT_CATALOGUE,
  findCatalogueAssessment,
  projectAssessmentFor,
  projectAssessmentSkillSlug,
} from "@/modules/assessments/catalogue";
import {
  assessmentRewards,
  gradeQuiz,
  publicDefinition,
  ratingsComplete,
  selfReviewEvaluation,
  type Evaluation,
  type PublicAssessmentDefinition,
} from "@/modules/assessments/grading";
import type { PracticalSubmission, ProjectAssessmentSubmission } from "@/modules/assessments/schemas";
import type { AssessmentDefinition, AssessmentFeedback, QuizDefinition, RubricDefinition } from "@/modules/assessments/types";
import { evaluateWithAI } from "@/server/ai/assessment-evaluator";
import { awardXp } from "@/server/progression/engine";
import { assessmentRepository } from "@/server/repositories/assessment.repository";
import { skillRepository } from "@/server/repositories/skill.repository";
import { checkAchievements } from "@/server/services/achievement.service";
import { aiAllowedFor } from "@/server/services/plan.service";
import { awardSkills, ensureSkillCatalogue } from "@/server/services/skill.service";

/**
 * Assessments (spec §25): quizzes check understanding, practical tasks and
 * project reviews check ability. Every attempt is evaluated on submit and
 * recorded with who evaluated it. Only a first pass of an assessment pays
 * XP; retakes are always allowed and never cost anything.
 */

export class AssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentError";
  }
}

type Skill = NonNullable<Awaited<ReturnType<typeof skillRepository.findSkillBySlug>>>;

/** Resolves a key to its definition and skill: catalogue first, then project reviews. */
async function resolveDefinition(key: string): Promise<{ definition: AssessmentDefinition; skill: Skill } | null> {
  await ensureSkillCatalogue();
  const catalogued = findCatalogueAssessment(key);
  const skillSlug = catalogued?.skillSlug ?? projectAssessmentSkillSlug(key);
  if (!skillSlug) return null;
  const skill = await skillRepository.findSkillBySlug(skillSlug);
  if (!skill) return null;
  return { definition: catalogued ?? projectAssessmentFor(skill), skill };
}

async function requireDefinition<K extends AssessmentKind>(key: string, kind: K) {
  const resolved = await resolveDefinition(key);
  if (!resolved || resolved.definition.kind !== kind) throw new AssessmentError("That assessment doesn't exist");
  return resolved as { definition: Extract<AssessmentDefinition, { kind: K }>; skill: Skill };
}

// ─── Views ───────────────────────────────────────────────────────────────────

export type AssessmentListItem = {
  key: string;
  kind: AssessmentKind;
  title: string;
  summary: string;
  minutes: number;
  skill: { slug: string; name: string };
  tree: { slug: string; name: string; emoji: string };
  attempts: number;
  passed: boolean;
  bestPercent: number | null;
};

export type AttemptListItem = Awaited<ReturnType<typeof assessmentRepository.listAttempts>>[number];

export type AssessmentsOverview = {
  items: AssessmentListItem[];
  recent: AttemptListItem[];
  totals: { passed: number; attempts: number; abilityPassed: number };
};

export async function getAssessmentsOverview(userId: string): Promise<AssessmentsOverview> {
  await ensureSkillCatalogue();
  const [attempts, reviewable] = await Promise.all([
    assessmentRepository.listAttempts(userId),
    assessmentRepository.projectReviewableSkills(userId),
  ]);

  const skillSlugs = [...new Set(ASSESSMENT_CATALOGUE.map((definition) => definition.skillSlug))];
  const skills = await Promise.all(skillSlugs.map((slug) => skillRepository.findSkillBySlug(slug)));
  const skillBySlug = new Map(skills.filter((skill): skill is Skill => skill !== null).map((skill) => [skill.slug, skill]));

  const definitions: { definition: AssessmentDefinition; skill: { slug: string; name: string; tree: { slug: string; name: string; emoji: string } } }[] = [
    ...ASSESSMENT_CATALOGUE.flatMap((definition) => {
      const skill = skillBySlug.get(definition.skillSlug);
      return skill ? [{ definition, skill }] : [];
    }),
    ...reviewable.map((skill) => ({ definition: projectAssessmentFor(skill) as AssessmentDefinition, skill })),
  ];

  const items = definitions.map(({ definition, skill }): AssessmentListItem => {
    const mine = attempts.filter((attempt) => attempt.assessmentKey === definition.key);
    return {
      key: definition.key,
      kind: definition.kind,
      title: definition.title,
      summary: definition.summary,
      minutes: definition.minutes,
      skill: { slug: skill.slug, name: skill.name },
      tree: { slug: skill.tree.slug, name: skill.tree.name, emoji: skill.tree.emoji },
      attempts: mine.length,
      passed: mine.some((attempt) => attempt.outcome === "PASSED"),
      bestPercent: mine.length > 0 ? Math.max(...mine.map((attempt) => attempt.percent)) : null,
    };
  });

  const passedKeys = new Set(attempts.filter((a) => a.outcome === "PASSED").map((a) => a.assessmentKey));
  const abilityKeys = new Set(attempts.filter((a) => a.outcome === "PASSED" && a.kind !== "QUIZ").map((a) => a.assessmentKey));
  return {
    items,
    recent: attempts.slice(0, 10),
    totals: { passed: passedKeys.size, attempts: attempts.length, abilityPassed: abilityKeys.size },
  };
}

export type AssessmentToTake = {
  definition: PublicAssessmentDefinition;
  skill: { slug: string; name: string; tree: { slug: string; name: string; emoji: string } };
  attempts: Awaited<ReturnType<typeof assessmentRepository.listAttemptsFor>>;
  passed: boolean;
  /** For project reviews: completed, evidenced projects that used this skill. */
  projects: { id: string; title: string; evidenceCount: number; completedAt: Date | null }[];
};

export async function getAssessmentToTake(userId: string, key: string): Promise<AssessmentToTake | null> {
  const resolved = await resolveDefinition(key);
  if (!resolved) return null;
  const { definition, skill } = resolved;

  const [attempts, projects] = await Promise.all([
    assessmentRepository.listAttemptsFor(userId, definition.key),
    definition.kind === "PROJECT" ? assessmentRepository.eligibleProjectsForSkill(userId, skill.id) : Promise.resolve([]),
  ]);

  return {
    definition: publicDefinition(definition),
    skill: { slug: skill.slug, name: skill.name, tree: { slug: skill.tree.slug, name: skill.tree.name, emoji: skill.tree.emoji } },
    attempts,
    passed: attempts.some((attempt) => attempt.outcome === "PASSED"),
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      evidenceCount: project.evidence.length,
      completedAt: project.completedAt,
    })),
  };
}

export type AttemptView = {
  id: string;
  title: string;
  kind: AssessmentKind;
  assessmentKey: string;
  outcome: AssessmentOutcome;
  evaluator: AssessmentEvaluator;
  percent: number;
  score: number;
  maxScore: number;
  xpAwarded: number;
  passPercent: number;
  createdAt: Date;
  response: string | null;
  feedback: AssessmentFeedback;
  skill: { slug: string; name: string; tree: { slug: string; name: string; emoji: string } };
  project: { id: string; title: string } | null;
  evidence: { id: string; title: string; url: string | null }[];
  /** Quiz review. Correct answers and explanations only after a pass. */
  questions: { prompt: string; options: readonly string[]; chosen: number | null; correct: boolean; answer: number | null; explanation: string | null }[];
};

export async function getAttempt(userId: string, attemptId: string): Promise<AttemptView | null> {
  const attempt = await assessmentRepository.findAttemptOwned(userId, attemptId);
  if (!attempt) return null;

  const definition = attempt.definition as unknown as AssessmentDefinition;
  const feedback = attempt.feedback as unknown as AssessmentFeedback;
  const passed = attempt.outcome === "PASSED";
  const answers = attempt.kind === "QUIZ" && Array.isArray(attempt.answers) ? (attempt.answers as number[]) : [];

  return {
    id: attempt.id,
    title: attempt.title,
    kind: attempt.kind,
    assessmentKey: attempt.assessmentKey,
    outcome: attempt.outcome,
    evaluator: attempt.evaluator,
    percent: attempt.percent,
    score: attempt.score,
    maxScore: attempt.maxScore,
    xpAwarded: attempt.xpAwarded,
    passPercent: definition.passPercent,
    createdAt: attempt.createdAt,
    response: attempt.response,
    feedback,
    skill: attempt.skill,
    project: attempt.project,
    evidence: attempt.evidence.map(({ id, title, url }) => ({ id, title, url })),
    questions:
      definition.kind === "QUIZ"
        ? definition.questions.map((question, index) => ({
            prompt: question.prompt,
            options: question.options,
            chosen: answers[index] ?? null,
            correct: feedback.questions?.[index]?.correct ?? false,
            answer: passed ? question.answer : null,
            explanation: passed ? question.explanation : null,
          }))
        : [],
  };
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export type SubmissionOutcome = {
  attemptId: string;
  outcome: AssessmentOutcome;
  percent: number;
  xpAwarded: number;
  achievements: UnlockedAchievement[];
};

async function record(
  userId: string,
  definition: AssessmentDefinition,
  skill: Skill,
  evaluation: Evaluation,
  extra: { answers?: unknown; response?: string; projectId?: string; evidence?: { title: string; url: string } },
): Promise<SubmissionOutcome> {
  // Checked before writing, so this attempt's own pass doesn't count as "before".
  const passedBefore = await assessmentRepository.hasPassed(userId, definition.key);

  const attempt = await assessmentRepository.create(
    {
      userId,
      assessmentKey: definition.key,
      kind: definition.kind,
      skillId: skill.id,
      title: definition.title,
      definition: definition as never,
      answers: (extra.answers ?? undefined) as never,
      response: extra.response ?? null,
      projectId: extra.projectId ?? null,
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      percent: evaluation.percent,
      outcome: evaluation.outcome,
      evaluator: evaluation.evaluator,
      feedback: evaluation.feedback as never,
    },
    extra.evidence,
  );

  let xpAwarded = 0;
  let achievements: UnlockedAchievement[] = [];
  if (evaluation.outcome === "PASSED") {
    if (!passedBefore) {
      const rewards = assessmentRewards(definition.kind, skill.baseXp);
      // One payout per user per assessment, ever.
      const sourceId = `${userId}:${definition.key}`;
      const reason = `Passed: ${definition.title}`;
      const outcome = await awardXp({
        userId,
        amount: rewards.xp,
        sourceType: "ASSESSMENT_PASSED",
        sourceId,
        lifeArea: skill.tree.lifeArea,
        reason,
      });
      await awardSkills(userId, { sourceType: "ASSESSMENT_PASSED", sourceId, reason }, [{ skillId: skill.id, amount: rewards.skillXp }]);
      xpAwarded = outcome.xpAwarded;
      if (xpAwarded > 0) await assessmentRepository.setXpAwarded(attempt.id, xpAwarded);
    }
    try {
      achievements = await checkAchievements(userId);
    } catch (error) {
      console.error("Achievement check failed after assessment", attempt.id, error);
    }
  }

  return { attemptId: attempt.id, outcome: evaluation.outcome, percent: evaluation.percent, xpAwarded, achievements };
}

export async function submitQuiz(userId: string, input: { assessmentKey: string; answers: number[] }): Promise<SubmissionOutcome> {
  const { definition, skill } = await requireDefinition(input.assessmentKey, "QUIZ");
  const quiz = definition as QuizDefinition;
  if (input.answers.length !== quiz.questions.length) {
    throw new AssessmentError("Answer every question before submitting");
  }
  const evaluation = gradeQuiz(quiz, input.answers);
  return record(userId, quiz, skill, evaluation, { answers: input.answers });
}

async function evaluateRubric(userId: string, definition: RubricDefinition, submission: Parameters<typeof evaluateWithAI>[1]): Promise<Evaluation> {
  if (!ratingsComplete(definition, submission.selfRatings)) {
    throw new AssessmentError("Rate your work on every criterion before submitting");
  }
  const allowAI = await aiAllowedFor(userId);
  return (await evaluateWithAI(definition, submission, { allowAI })) ?? selfReviewEvaluation(definition, submission.selfRatings);
}

export async function submitPractical(userId: string, input: PracticalSubmission): Promise<SubmissionOutcome> {
  const { definition, skill } = await requireDefinition(input.assessmentKey, "PRACTICAL");
  const evidenceUrl = input.evidenceUrl!;
  const evaluation = await evaluateRubric(userId, definition, {
    response: input.response,
    evidence: [{ title: definition.deliverable, url: evidenceUrl, note: null }],
    selfRatings: input.ratings,
  });
  return record(userId, definition, skill, evaluation, {
    answers: input.ratings,
    response: input.response,
    evidence: { title: definition.title, url: evidenceUrl },
  });
}

export async function submitProjectAssessment(userId: string, input: ProjectAssessmentSubmission): Promise<SubmissionOutcome> {
  const { definition, skill } = await requireDefinition(input.assessmentKey, "PROJECT");
  const projects = await assessmentRepository.eligibleProjectsForSkill(userId, skill.id);
  const project = projects.find((candidate) => candidate.id === input.projectId);
  if (!project) {
    throw new AssessmentError(`Choose a completed project with evidence that used ${skill.name}`);
  }

  const evaluation = await evaluateRubric(userId, definition, {
    response: input.response,
    evidence: project.evidence.map(({ title, url, note }) => ({ title, url, note })),
    selfRatings: input.ratings,
    context: { project: { title: project.title, description: project.description, category: project.category, reflection: project.reflection } },
  });
  return record(userId, definition, skill, evaluation, {
    answers: input.ratings,
    response: input.response,
    projectId: project.id,
  });
}
