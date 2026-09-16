import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { skillXpForLevel } from "@/modules/skills/levels";
import { db } from "@/server/db";

import { ensureSkillCatalogue, getSkillsOverview, getSkillTreeDetail, questCompleted, questCompletionReverted } from "./skill.service";

/**
 * The skill system against the real database: catalogue sync, quest routing,
 * the per-skill ledger, unlock chains, idempotency and exact revocation.
 */

const HANDLE = `integration-skills-${Date.now()}`;
const qid = (name: string) => `${HANDLE}-${name}`;
let userId: string;

const questEvent = (name: string, overrides: Partial<Parameters<typeof questCompleted>[0]> = {}) => ({
  userId,
  questId: qid(name),
  lifeArea: "PHYSICAL" as const,
  templateKey: "physical.walk",
  title: "Walk for 20 minutes",
  goalTitle: null,
  xpReward: 35,
  ...overrides,
});

beforeAll(async () => {
  const user = await db.user.create({ data: { handle: HANDLE, displayName: "Skill Tester", timezone: "UTC" } });
  userId = user.id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

describe("catalogue sync", () => {
  it("creates the built-in trees and skills, idempotently", async () => {
    await ensureSkillCatalogue();
    const trees = await db.skillTree.findMany({ include: { skills: true } });
    expect(trees.length).toBeGreaterThanOrEqual(11);

    const programming = trees.find((tree) => tree.slug === "programming")!;
    const bySlug = new Map(programming.skills.map((skill) => [skill.slug, skill]));
    const python = bySlug.get("programming.python")!;
    const syntax = bySlug.get("programming.syntax")!;
    const aiMl = bySlug.get("programming.ai-ml")!;

    // Structure and gates from the spec's example tree.
    expect(syntax.parentId).toBe(python.id);
    expect(python.requiresId).toBe(bySlug.get("programming.fundamentals")!.id);
    expect(aiMl.requiresId).toBe(python.id);
    expect(aiMl.unlockLevel).toBe(3);
    // Skills are not artificially equal.
    expect(aiMl.baseXp).toBeGreaterThan(syntax.baseXp);
  });
});

describe("quest completions feeding skills", () => {
  it("routes a physical quest into fitness and writes the ledger", async () => {
    const outcome = await questCompleted(questEvent("walk-1"));

    // Endurance is locked until foundations levels, so the award falls back
    // down the requirement chain to Movement Foundations.
    expect(outcome).toMatchObject({
      awarded: true,
      treeSlug: "fitness",
      skillSlug: "fitness.foundations",
      xpAwarded: 35,
      leveledUp: true, // foundations level 1 costs 25 XP
      level: 1,
    });

    const ledger = await db.skillXpTransaction.findMany({ where: { userId } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ amount: 35, sourceType: "QUEST_COMPLETION", sourceId: qid("walk-1"), reason: "Walk for 20 minutes" });
    expect(await db.userSkill.count({ where: { userId } })).toBe(1);
  });

  it("never pays the same quest twice", async () => {
    const again = await questCompleted(questEvent("walk-1"));
    expect(again).toMatchObject({ awarded: false, xpAwarded: 0 });
    expect(await db.skillXpTransaction.count({ where: { userId, sourceId: qid("walk-1") } })).toBe(1);
  });

  it("trains the mapped skill itself once its gate is open", async () => {
    // Foundations reached level 1, so Endurance (the walk template's real
    // target) is unlocked — the next walk trains Endurance directly.
    const outcome = await questCompleted(questEvent("walk-2", { xpReward: 40 }));
    expect(outcome).toMatchObject({ awarded: true, skillSlug: "fitness.endurance", level: 0 });
  });

  it("reports unlocks when a gate level is crossed", async () => {
    // Endurance level 2 (needs 50×3=150 XP) is the gate for Sport & Athletics.
    await questCompleted(questEvent("walk-3", { xpReward: 35 })); // endurance 75 → level 1
    await questCompleted(questEvent("walk-4", { xpReward: 40 })); // endurance 115
    const crossing = await questCompleted(questEvent("walk-5", { xpReward: 35 })); // endurance 150 → level 2

    expect(crossing).toMatchObject({ awarded: true, skillSlug: "fitness.endurance", level: 2, leveledUp: true });
    expect(crossing!.unlocked).toEqual([{ slug: "fitness.athletics", name: "Sport & Athletics" }]);
  });

  it("routes goal-driven quests into the goal's tree frontier", async () => {
    const outcome = await questCompleted(
      questEvent("code-1", {
        lifeArea: "PERSONAL_GOAL",
        templateKey: "goal.mission",
        title: "Work on: install Python",
        goalTitle: "Learn Python programming",
        xpReward: 50,
      }),
    );
    expect(outcome).toMatchObject({ awarded: true, treeSlug: "programming", skillSlug: "programming.fundamentals" });
  });

  it("returns null for quests that train no catalogued skill", async () => {
    const outcome = await questCompleted(
      questEvent("meditate-1", { lifeArea: "MENTAL", templateKey: "mental.meditation", title: "Meditate for 10 minutes" }),
    );
    expect(outcome).toBeNull();
    expect(await db.skillXpTransaction.count({ where: { userId, sourceId: qid("meditate-1") } })).toBe(0);
  });

  it("revokes exactly what a quest awarded, removing empty unlock records", async () => {
    const before = await db.skillXpTransaction.count({ where: { userId } });
    await questCompletionReverted(userId, qid("code-1"));

    expect(await db.skillXpTransaction.count({ where: { userId } })).toBe(before - 1);
    // programming.fundamentals had only that one transaction → unlock record gone.
    const programmingSkills = await db.userSkill.count({ where: { userId, skill: { tree: { slug: "programming" } } } });
    expect(programmingSkills).toBe(0);
    // Fitness progress is untouched.
    expect(await db.skillXpTransaction.count({ where: { userId, skill: { tree: { slug: "fitness" } } } })).toBe(5);

    // Revoking again is a no-op; the quest can pay again after being redone.
    await questCompletionReverted(userId, qid("code-1"));
    const reawarded = await questCompleted(
      questEvent("code-1", {
        lifeArea: "PERSONAL_GOAL",
        templateKey: "goal.mission",
        title: "Work on: install Python",
        goalTitle: "Learn Python programming",
        xpReward: 50,
      }),
    );
    expect(reawarded).toMatchObject({ awarded: true, skillSlug: "programming.fundamentals" });
  });
});

describe("views", () => {
  it("summarises know → learning → next across trees", async () => {
    const overview = await getSkillsOverview(userId);
    expect(overview.trees.length).toBeGreaterThanOrEqual(11);
    expect(overview.totals.known).toBeGreaterThanOrEqual(1); // foundations reached level 2
    expect(overview.totals.learning).toBeGreaterThanOrEqual(1);
    expect(overview.totals.availableNext).toBeGreaterThan(0);

    const fitness = overview.trees.find((tree) => tree.slug === "fitness")!;
    expect(fitness.summary.learning).toBeGreaterThanOrEqual(1);
    expect(fitness.frontier).toBeTruthy();
    expect(overview.recent.length).toBeGreaterThan(0);
  });

  it("builds the full tree detail with statuses and scoped history", async () => {
    const fitness = (await getSkillTreeDetail(userId, "fitness"))!;
    const byFitnessSlug = new Map(fitness.nodes.map((node) => [node.slug, node]));

    const foundations = byFitnessSlug.get("fitness.foundations")!;
    expect(foundations.status).toBe("IN_PROGRESS");
    expect(foundations.progress).toMatchObject({ level: 1, xp: 35 });

    const endurance = byFitnessSlug.get("fitness.endurance")!;
    expect(endurance.status).toBe("IN_PROGRESS");
    expect(endurance.progress.xp).toBe(150);
    expect(endurance.progress.level).toBe(2);
    expect(skillXpForLevel(endurance.baseXp, 2)).toBe(150);
    // Its level-2 gate is met, so Athletics is now available.
    expect(byFitnessSlug.get("fitness.athletics")!.status).toBe("AVAILABLE");

    // Deep in the programming tree, gates are still shut.
    const programming = (await getSkillTreeDetail(userId, "programming"))!;
    const python = programming.nodes.find((node) => node.slug === "programming.python")!;
    const syntax = python.children.find((node) => node.slug === "programming.syntax")!;
    expect(syntax.status).toBe("LOCKED");
    expect(syntax.requirement).toMatchObject({ slug: "programming.python", level: 1 });

    expect(fitness.history.every((entry) => entry.tree.slug === "fitness")).toBe(true);
    expect(await getSkillTreeDetail(userId, "no-such-tree")).toBeNull();
  });
});
