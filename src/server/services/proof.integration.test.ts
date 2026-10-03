import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The AI evaluator is exercised through the mock provider, whatever .env says.
vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>();
  return { ...actual, getEnv: () => ({ ...actual.getEnv(), AI_PROVIDER: "mock" as const }) };
});

import { findCatalogueAssessment } from "@/modules/assessments/catalogue";
import type { PracticalDefinition, QuizDefinition } from "@/modules/assessments/types";
import { getMockAIProvider, resetAIProviderForTests } from "@/server/ai";
import { db } from "@/server/db";

import * as assessments from "./assessment.service";
import * as projects from "./project.service";
import { awardSkills, getSkillTreeDetail } from "./skill.service";

/**
 * Phase 8 against the real database: projects that pay only with evidence,
 * assessments evaluated by answer key / AI / self-review, mastery gated on
 * demonstrated ability, and the passport's proof tiers.
 */

const HANDLE = `integration-proof-${Date.now()}`;
let userId: string;
let fundamentalsId: string;
let syntaxId: string;

const quiz = findCatalogueAssessment("quiz.programming.fundamentals") as QuizDefinition;
const practical = findCatalogueAssessment("practical.programming.fundamentals") as PracticalDefinition;
const ratingsOf = (value: number) => Object.fromEntries(practical.criteria.map((criterion) => [criterion.key, value]));

beforeAll(async () => {
  // Premium, so AI rubric evaluation is allowed.
  const user = await db.user.create({ data: { handle: HANDLE, displayName: "Proof Tester", timezone: "UTC", plan: "PREMIUM" } });
  userId = user.id;
  await projects.listSkillOptions(); // syncs the skill catalogue
  fundamentalsId = (await db.skill.findUniqueOrThrow({ where: { slug: "programming.fundamentals" } })).id;
  syntaxId = (await db.skill.findUniqueOrThrow({ where: { slug: "programming.syntax" } })).id;
});

afterEach(() => resetAIProviderForTests());

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

const xpFrom = async (sourceType: "PROJECT_COMPLETION" | "ASSESSMENT_PASSED") =>
  (await db.xpTransaction.aggregate({ where: { userId, sourceType }, _sum: { amount: true } }))._sum.amount ?? 0;

describe("projects", () => {
  let projectId: string;

  it("won't complete without evidence, then pays character and skill XP once it has some", async () => {
    const project = await projects.createProject(userId, {
      title: "Tip calculator",
      description: null,
      category: "SOFTWARE",
      skillIds: [fundamentalsId, syntaxId],
      reflection: null,
      milestones: ["Sketch it", "Build it"],
    });
    projectId = project.id;

    await expect(projects.transitionProject(userId, projectId, "complete")).rejects.toThrow(/evidence/);

    const created = await projects.getProject(userId, projectId);
    await projects.setProjectMilestoneDone(userId, created!.milestones[0].id, true);
    await projects.addEvidence(userId, { projectId, kind: "REPOSITORY", title: "Code", url: "https://example.com/tips", note: null });

    const outcome = await projects.transitionProject(userId, projectId, "complete");
    // 100 base + 20 for one finished milestone + 10 for one piece of evidence.
    expect(outcome!.xpAwarded).toBe(130);
    expect(outcome!.skills.map((skill) => [skill.slug, skill.xpAwarded])).toEqual(
      expect.arrayContaining([
        ["programming.fundamentals", 45],
        ["programming.syntax", 60],
      ]),
    );
    expect(outcome!.achievements.map((achievement) => achievement.slug)).toContain("first-project");
    expect(await xpFrom("PROJECT_COMPLETION")).toBe(130);
  });

  it("locks milestones while complete, and reopening takes the payment back exactly", async () => {
    const project = await projects.getProject(userId, projectId);
    await expect(projects.setProjectMilestoneDone(userId, project!.milestones[1].id, true)).rejects.toThrow(/Reopen/);
    await expect(projects.deleteEvidence(userId, project!.evidence[0].id)).rejects.toThrow(/at least one/);

    await projects.transitionProject(userId, projectId, "reopen");
    expect(await xpFrom("PROJECT_COMPLETION")).toBe(0);
    expect(await db.skillXpTransaction.count({ where: { userId, sourceType: "PROJECT_COMPLETION" } })).toBe(0);

    await projects.transitionProject(userId, projectId, "complete");
    expect(await xpFrom("PROJECT_COMPLETION")).toBe(130);
  });

  it("rejects skills that don't exist and projects that aren't yours", async () => {
    await expect(
      projects.createProject(userId, { title: "Nope", description: null, category: "ART", skillIds: ["not-a-skill"], reflection: null, milestones: [] }),
    ).rejects.toThrow(/doesn't exist/);
    const other = await db.user.create({ data: { handle: `${HANDLE}-other`, displayName: "Other", timezone: "UTC" } });
    await expect(projects.transitionProject(other.id, projectId, "reopen")).rejects.toThrow(/doesn't exist/);
  });
});

describe("quizzes", () => {
  it("grades on the server, pays only the first pass, and never pays a not-yet", async () => {
    const wrong = quiz.questions.map((question) => (question.answer + 1) % question.options.length);
    const miss = await assessments.submitQuiz(userId, { assessmentKey: quiz.key, answers: wrong });
    expect(miss).toMatchObject({ outcome: "NOT_YET", percent: 0, xpAwarded: 0 });

    const right = quiz.questions.map((question) => question.answer);
    const pass = await assessments.submitQuiz(userId, { assessmentKey: quiz.key, answers: right });
    expect(pass).toMatchObject({ outcome: "PASSED", percent: 100, xpAwarded: 40 });

    const again = await assessments.submitQuiz(userId, { assessmentKey: quiz.key, answers: right });
    expect(again).toMatchObject({ outcome: "PASSED", xpAwarded: 0 });
    expect(await xpFrom("ASSESSMENT_PASSED")).toBe(40);

    await expect(assessments.submitQuiz(userId, { assessmentKey: quiz.key, answers: [0] })).rejects.toThrow(/every question/);

    // Answers are revealed only for passing attempts.
    const missed = await assessments.getAttempt(userId, miss.attemptId);
    expect(missed!.questions.every((question) => question.answer === null && question.explanation === null)).toBe(true);
    const passed = await assessments.getAttempt(userId, pass.attemptId);
    expect(passed!.questions.every((question) => question.answer !== null)).toBe(true);
  });
});

describe("mastery needs proof", () => {
  it("keeps a top-level skill out of MASTERED until ability is demonstrated", async () => {
    // Push fundamentals (30 XP/level, 3 levels) to its top level through practice.
    await awardSkills(userId, { sourceType: "ADJUSTMENT", sourceId: `${HANDLE}-practice`, reason: "practice" }, [
      { skillId: fundamentalsId, amount: 300 },
    ]);
    const before = await getSkillTreeDetail(userId, "programming");
    const node = before!.nodes.find((n) => n.slug === "programming.fundamentals")!;
    expect(node.progress.mastered).toBe(true);
    expect(node).toMatchObject({ status: "IN_PROGRESS", awaitingProof: true });
  });

  it("uses the AI's rubric scores, but the backend decides — high self-ratings can't carry a weak review", async () => {
    getMockAIProvider().register("assessments.evaluate", () => ({
      criteria: practical.criteria.map((criterion) => ({ key: criterion.key, score: 1, note: "Only partly shown." })),
      summary: "A start, but the program isn't shown working.",
      nextStep: "Add a run-through of it working.",
    }));
    const outcome = await assessments.submitPractical(userId, {
      assessmentKey: practical.key,
      response: "I built a tip calculator that asks for the bill and splits it between friends, with a loop for each person.",
      evidenceUrl: "https://example.com/tips",
      ratings: ratingsOf(4),
    });
    expect(outcome).toMatchObject({ outcome: "NOT_YET", percent: 25, xpAwarded: 0 });
    const attempt = await assessments.getAttempt(userId, outcome.attemptId);
    expect(attempt).toMatchObject({ evaluator: "AI" });
    expect(attempt!.evidence).toHaveLength(1);
  });

  it("falls back to a labelled self-review when AI output doesn't fit the rubric", async () => {
    getMockAIProvider().register("assessments.evaluate", () => ({
      criteria: [{ key: "works", score: 4, note: "ok" }],
      summary: "Missing criteria",
      nextStep: "n/a",
    }));
    await expect(
      assessments.submitPractical(userId, {
        assessmentKey: practical.key,
        response: "I built a tip calculator that asks for the bill and splits it between friends, with a loop for each person.",
        evidenceUrl: "https://example.com/tips",
        ratings: { works: 3 },
      }),
    ).rejects.toThrow(/every criterion/);

    const outcome = await assessments.submitPractical(userId, {
      assessmentKey: practical.key,
      response: "I built a tip calculator that asks for the bill and splits it between friends, with a loop for each person.",
      evidenceUrl: "https://example.com/tips",
      ratings: ratingsOf(3),
    });
    expect(outcome).toMatchObject({ outcome: "PASSED", percent: 75, xpAwarded: 80 });
    expect(await assessments.getAttempt(userId, outcome.attemptId)).toMatchObject({ evaluator: "SELF_REVIEW" });
    expect(outcome.achievements.map((achievement) => achievement.slug)).toContain("proof-over-claims");

    const after = await getSkillTreeDetail(userId, "programming");
    expect(after!.nodes.find((n) => n.slug === "programming.fundamentals")).toMatchObject({ status: "MASTERED", awaitingProof: false });
  });

  it("reviews only completed, evidenced projects that used the skill", async () => {
    const key = "project.programming.syntax";
    const [project] = (await projects.listProjects(userId)).filter((p) => p.status === "COMPLETED");
    await expect(
      assessments.submitProjectAssessment(userId, {
        assessmentKey: "project.programming.backend",
        projectId: project.id,
        response: "The calculator used functions and loops throughout, and I learned to split logic into small pieces.",
        ratings: { real: 4, application: 4, evidence: 4, reflection: 4 },
      }),
    ).rejects.toThrow(/Choose a completed project/);

    const outcome = await assessments.submitProjectAssessment(userId, {
      assessmentKey: key,
      projectId: project.id,
      response: "The calculator is written in Python end to end; list comprehensions split the bill and I learned to test edge cases.",
      ratings: { real: 4, application: 3, evidence: 3, reflection: 3 },
    });
    expect(outcome).toMatchObject({ outcome: "PASSED", xpAwarded: 120 });
    const view = await assessments.getAssessmentToTake(userId, key);
    expect(view).toMatchObject({ passed: true });
    expect(view!.projects.map((p) => p.id)).toEqual([project.id]);
  });
});

describe("skill passport", () => {
  it("assembles proof tiers and evidence from what was actually earned", async () => {
    vi.resetModules();
    vi.doMock("@/server/auth/current-user", () => ({
      getCurrentUser: async () => db.user.findUniqueOrThrow({ where: { id: userId } }),
    }));
    const { getSkillPassport } = await import("./passport.service");
    const passport = await getSkillPassport();

    const bySlug = new Map(passport.skills.map((skill) => [skill.slug, skill]));
    expect(bySlug.get("programming.fundamentals")).toMatchObject({ tier: "MASTERED", level: 3 });
    expect(bySlug.get("programming.syntax")).toMatchObject({ tier: "DEMONSTRATED" });
    // Strongest proof first.
    expect(passport.skills[0].slug).toBe("programming.fundamentals");

    expect(passport.stats).toMatchObject({ projectsCompleted: 1, skillsMastered: 1, skillsDemonstrated: 2 });
    expect(passport.stats.assessmentsPassed).toBe(3);
    // Project evidence + the practical's hand-ins.
    expect(passport.proof.length).toBeGreaterThanOrEqual(2);
    expect(passport.masteryAreas[0]).toMatchObject({ slug: "programming", skillsMastered: 1 });
    expect(passport.milestones.some((milestone) => milestone.kind === "project")).toBe(true);
  });
});
