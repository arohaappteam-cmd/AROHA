import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { awardXp, revokeXp } from "@/server/progression/engine";
import { progressionRepository } from "@/server/repositories/progression.repository";

import * as goals from "./goal.service";
import { getPlanOverview, setPlanInterest } from "./plan.service";
import * as projects from "./project.service";

/**
 * Plan limits and the database-maintained XP total, against the real
 * database. Throwaway users only.
 */

const HANDLE = `integration-plans-${Date.now()}`;
let freeId: string;
let proId: string;

const goalInput = (title: string) => ({
  title,
  lifeArea: "LEARNING" as const,
  motivation: null,
  target: null,
  description: null,
  startingPoint: "NEW" as const,
  deadline: null,
  generateRoadmap: false,
});

const projectInput = (title: string) => ({ title, description: null, category: "ART" as const, skillIds: [], reflection: null, milestones: [] });

/** The rollup must always equal the ledger it summarises. */
async function expectRollupMatchesLedger(userId: string) {
  const [user, ledger] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { totalXp: true } }),
    db.xpTransaction.aggregate({ where: { userId }, _sum: { amount: true } }),
  ]);
  expect(user.totalXp).toBe(ledger._sum.amount ?? 0);
  return user.totalXp;
}

beforeAll(async () => {
  freeId = (await db.user.create({ data: { handle: HANDLE, displayName: "Free Tester", timezone: "UTC" } })).id;
  proId = (await db.user.create({ data: { handle: `${HANDLE}-pro`, displayName: "Pro Tester", timezone: "UTC", plan: "PRO" } })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

describe("plan limits", () => {
  it("lets Free hold three active goals, then explains the limit", async () => {
    for (const title of ["One", "Two", "Three"]) await goals.createGoal(freeId, goalInput(title));
    await expect(goals.createGoal(freeId, goalInput("Four"))).rejects.toThrow(/Free plan includes 3 active goals/);
  });

  it("frees a slot when a goal is completed or archived, and guards the way back", async () => {
    const [first, second] = await db.goal.findMany({ where: { userId: freeId }, orderBy: { createdAt: "asc" } });
    await goals.transitionGoal(freeId, first.id, "complete");
    const fourth = await goals.createGoal(freeId, goalInput("Four"));
    // Reopening the completed one would make four active.
    await expect(goals.transitionGoal(freeId, first.id, "reopen")).rejects.toThrow(/Free plan/);

    await goals.setArchived(freeId, second.id, true);
    await goals.createGoal(freeId, goalInput("Five"));
    // Restoring the archived, unfinished one would too.
    await expect(goals.setArchived(freeId, second.id, false)).rejects.toThrow(/Free plan/);
    expect(fourth.id).toBeTruthy();
  });

  it("gives Pro unlimited goals", async () => {
    for (const title of ["A", "B", "C", "D", "E"]) await goals.createGoal(proId, goalInput(title));
    expect(await db.goal.count({ where: { userId: proId } })).toBe(5);
  });

  it("caps Free at two unfinished projects", async () => {
    await projects.createProject(freeId, projectInput("Sketchbook"));
    await projects.createProject(freeId, projectInput("Mural"));
    await expect(projects.createProject(freeId, projectInput("Gallery"))).rejects.toThrow(/2 active projects/);
    await projects.createProject(proId, projectInput("Gallery"));
    await projects.createProject(proId, projectInput("Studio"));
    await projects.createProject(proId, projectInput("Zine"));
  });
});

describe("plan interest", () => {
  it("records 'notify me' once per tier and can be withdrawn", async () => {
    const user = { id: freeId, plan: "FREE" as const };
    await setPlanInterest(freeId, "PRO", true);
    await setPlanInterest(freeId, "PRO", true);
    await setPlanInterest(freeId, "PREMIUM", true);
    expect((await getPlanOverview(user)).interests.sort()).toEqual(["PREMIUM", "PRO"]);
    await setPlanInterest(freeId, "PREMIUM", false);
    expect((await getPlanOverview(user)).interests).toEqual(["PRO"]);
  });
});

describe("User.totalXp rollup", () => {
  it("follows every award and revoke, inside the same transaction", async () => {
    const before = await expectRollupMatchesLedger(proId);
    const first = await awardXp({ userId: proId, amount: 40, sourceType: "ADJUSTMENT", sourceId: `${HANDLE}-a`, lifeArea: "LEARNING", reason: "Test award" });
    expect(first.totalXp).toBe(before + 40);
    await awardXp({ userId: proId, amount: 25, sourceType: "ADJUSTMENT", sourceId: `${HANDLE}-b`, lifeArea: null, reason: "Test award" });
    expect(await expectRollupMatchesLedger(proId)).toBe(before + 65);
    expect(await progressionRepository.getTotalXp(proId)).toBe(before + 65);

    // A repeat for the same source pays nothing and changes nothing.
    const repeat = await awardXp({ userId: proId, amount: 40, sourceType: "ADJUSTMENT", sourceId: `${HANDLE}-a`, lifeArea: "LEARNING", reason: "Test award" });
    expect(repeat.awarded).toBe(false);
    expect(await expectRollupMatchesLedger(proId)).toBe(before + 65);

    const revoked = await revokeXp(proId, "ADJUSTMENT", `${HANDLE}-a`);
    expect(revoked.totalXp).toBe(before + 25);
    expect(await expectRollupMatchesLedger(proId)).toBe(before + 25);
  });

  it("handles bulk writes across several users in one statement", async () => {
    await db.xpTransaction.createMany({
      data: [
        { userId: freeId, amount: 10, sourceType: "ADJUSTMENT", sourceId: `${HANDLE}-bulk-1`, reason: "Bulk" },
        { userId: freeId, amount: 15, sourceType: "ADJUSTMENT", sourceId: `${HANDLE}-bulk-2`, reason: "Bulk" },
        { userId: proId, amount: 5, sourceType: "ADJUSTMENT", sourceId: `${HANDLE}-bulk-3`, reason: "Bulk" },
      ],
    });
    await expectRollupMatchesLedger(freeId);
    await expectRollupMatchesLedger(proId);
    await db.xpTransaction.deleteMany({ where: { sourceId: { startsWith: `${HANDLE}-bulk` } } });
    await expectRollupMatchesLedger(freeId);
    await expectRollupMatchesLedger(proId);
  });

  it("lets an account with XP be deleted (the cascade runs the triggers too)", async () => {
    const doomed = await db.user.create({ data: { handle: `${HANDLE}-doomed`, displayName: "Doomed", timezone: "UTC" } });
    await awardXp({ userId: doomed.id, amount: 30, sourceType: "ADJUSTMENT", sourceId: `${HANDLE}-doomed`, lifeArea: "MENTAL", reason: "Test award" });
    await expectRollupMatchesLedger(doomed.id);
    await db.user.delete({ where: { id: doomed.id } });
    expect(await db.xpTransaction.count({ where: { userId: doomed.id } })).toBe(0);
  });
});
