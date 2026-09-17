import { describe, expect, it } from "vitest";

import { findTreeSpec, flattenSpec, fullSkillSlug, SKILL_TREES } from "@/modules/skills/catalogue";

import { ASSESSMENT_CATALOGUE, findCatalogueAssessment, projectAssessmentFor, projectAssessmentSkillSlug } from "./catalogue";
import {
  aiRubricEvaluation,
  assessmentRewards,
  confirmsAbility,
  gradeQuiz,
  publicDefinition,
  ratingsComplete,
  scoreRubric,
  selfReviewEvaluation,
} from "./grading";
import type { PracticalDefinition, QuizDefinition } from "./types";

const ALL_SKILL_SLUGS = new Set(SKILL_TREES.flatMap((tree) => flattenSpec(tree).map(({ spec }) => fullSkillSlug(tree.slug, spec.slug))));

describe("assessment catalogue", () => {
  it("has unique keys, real skills, valid answer keys and rubrics", () => {
    const keys = ASSESSMENT_CATALOGUE.map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const definition of ASSESSMENT_CATALOGUE) {
      expect(ALL_SKILL_SLUGS.has(definition.skillSlug), definition.key).toBe(true);
      if (definition.kind === "QUIZ") {
        expect(definition.questions.length).toBeGreaterThanOrEqual(4);
        for (const question of definition.questions) {
          expect(question.answer).toBeGreaterThanOrEqual(0);
          expect(question.answer).toBeLessThan(question.options.length);
        }
      } else {
        const criteriaKeys = definition.criteria.map((criterion) => criterion.key);
        expect(new Set(criteriaKeys).size, definition.key).toBe(criteriaKeys.length);
        for (const criterion of definition.criteria) expect(criterion.weight).toBeGreaterThanOrEqual(1);
      }
    }
    expect(ASSESSMENT_CATALOGUE.some((d) => d.kind === "QUIZ")).toBe(true);
    expect(ASSESSMENT_CATALOGUE.some((d) => d.kind === "PRACTICAL")).toBe(true);
  });

  it("offers a project review for any skill", () => {
    expect(findTreeSpec("cooking")).toBeDefined();
    const definition = projectAssessmentFor({ slug: "cooking.baking", name: "Baking" });
    expect(definition).toMatchObject({ key: "project.cooking.baking", kind: "PROJECT", skillSlug: "cooking.baking" });
    expect(projectAssessmentSkillSlug(definition.key)).toBe("cooking.baking");
    expect(projectAssessmentSkillSlug("quiz.cooking.basics")).toBeNull();
  });
});

const quiz = findCatalogueAssessment("quiz.programming.fundamentals") as QuizDefinition;
const practical = findCatalogueAssessment("practical.programming.fundamentals") as PracticalDefinition;

describe("quiz grading", () => {
  it("grades against the answer key and applies the pass mark", () => {
    const perfect = gradeQuiz(quiz, quiz.questions.map((q) => q.answer));
    expect(perfect).toMatchObject({ score: 5, maxScore: 5, percent: 100, outcome: "PASSED", evaluator: "AUTO_GRADED" });

    const fourOfFive = gradeQuiz(quiz, quiz.questions.map((q, i) => (i === 0 ? (q.answer + 1) % q.options.length : q.answer)));
    expect(fourOfFive).toMatchObject({ score: 4, percent: 80, outcome: "PASSED" });

    const three = gradeQuiz(quiz, quiz.questions.map((q, i) => (i < 2 ? (q.answer + 1) % q.options.length : q.answer)));
    expect(three).toMatchObject({ score: 3, percent: 60, outcome: "NOT_YET" });
    expect(three.feedback.questions!.filter((q) => !q.correct).map((q) => q.index)).toEqual([0, 1]);
  });

  it("never sends answers or explanations to the client before an attempt", () => {
    const shown = publicDefinition(quiz);
    expect(JSON.stringify(shown)).not.toContain("explanation");
    expect(JSON.stringify(shown)).not.toContain('"answer"');
  });
});

describe("rubric scoring", () => {
  const all = (value: number) => Object.fromEntries(practical.criteria.map((c) => [c.key, value]));

  it("weights criteria and clamps ratings", () => {
    expect(scoreRubric(practical, all(4))).toMatchObject({ percent: 100 });
    expect(scoreRubric(practical, all(0))).toMatchObject({ score: 0, percent: 0 });
    expect(scoreRubric(practical, all(99)).percent).toBe(100);
    // "works" has weight 3 of a total 7: acing only it is 3/7 ≈ 42%.
    expect(scoreRubric(practical, { works: 4 }).percent).toBe(42);
  });

  it("requires a rating for every criterion", () => {
    expect(ratingsComplete(practical, all(3))).toBe(true);
    expect(ratingsComplete(practical, { works: 3 })).toBe(false);
    expect(ratingsComplete(practical, { ...all(3), works: 7 })).toBe(false);
  });

  it("self-review uses the same pass mark and is labelled as self-reviewed", () => {
    expect(selfReviewEvaluation(practical, all(3))).toMatchObject({ percent: 75, outcome: "PASSED", evaluator: "SELF_REVIEW" });
    expect(selfReviewEvaluation(practical, all(2))).toMatchObject({ percent: 50, outcome: "NOT_YET" });
  });

  it("accepts AI scores only when they cover exactly the rubric — and the backend decides the outcome", () => {
    const scores = practical.criteria.map((c) => ({ key: c.key, score: 2, note: "ok" }));
    const evaluation = aiRubricEvaluation(practical, { criteria: scores, summary: "Great work!", nextStep: "Add tests." })!;
    // The AI was enthusiastic, but 2/4 everywhere is 50%: not yet.
    expect(evaluation).toMatchObject({ evaluator: "AI", percent: 50, outcome: "NOT_YET" });
    expect(evaluation.feedback.summary.startsWith("Not yet")).toBe(true);

    expect(aiRubricEvaluation(practical, { criteria: scores.slice(1), summary: "s", nextStep: "n" })).toBeNull();
    expect(aiRubricEvaluation(practical, { criteria: [...scores, { key: "invented", score: 4, note: "" }], summary: "s", nextStep: "n" })).toBeNull();
  });
});

describe("rewards and meaning", () => {
  it("pays ability more than understanding", () => {
    const quizReward = assessmentRewards("QUIZ", 50);
    const practicalReward = assessmentRewards("PRACTICAL", 50);
    const projectReward = assessmentRewards("PROJECT", 50);
    expect(quizReward.xp).toBeLessThan(practicalReward.xp);
    expect(practicalReward.xp).toBeLessThan(projectReward.xp);
    expect(projectReward.skillXp).toBe(75);
  });

  it("only lets practical and project assessments confirm ability", () => {
    expect(confirmsAbility("QUIZ")).toBe(false);
    expect(confirmsAbility("PRACTICAL")).toBe(true);
    expect(confirmsAbility("PROJECT")).toBe(true);
  });
});
