import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { xpRequiredForLevel } from "@/modules/progression/levels";
import { db } from "@/server/db";

import { awardXp, revokeXp } from "./engine";

/**
 * The progression engine against the real ledger: XP transactions, levels,
 * stats, idempotency and the edge cases that must never double-pay.
 */

const HANDLE = `integration-progression-${Date.now()}`;
/** Source ids are unique per run: the ledger's (sourceType, sourceId) is global,
 *  and real ids are cuids. */
const src = (name: string) => `${HANDLE}-${name}`;
let userId: string;

const totals = async () => {
  const [xp, stats] = await Promise.all([
    db.xpTransaction.aggregate({ where: { userId }, _sum: { amount: true } }),
    db.statTransaction.groupBy({ by: ["attribute"], where: { userId }, _sum: { amount: true } }),
  ]);
  return {
    xp: xp._sum.amount ?? 0,
    stats: Object.fromEntries(stats.map((s) => [s.attribute, s._sum.amount ?? 0])),
  };
};

const award = (name: string, amount: number, lifeArea: "PHYSICAL" | "LEARNING" | "SOCIAL" = "PHYSICAL") =>
  awardXp({ userId, amount, sourceType: "QUEST_COMPLETION", sourceId: src(name), lifeArea, reason: `Quest ${name}` });

beforeAll(async () => {
  const user = await db.user.create({ data: { handle: HANDLE, displayName: "Progression Tester", timezone: "UTC" } });
  userId = user.id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

describe("awarding XP", () => {
  it("writes an auditable transaction and updates totals, level and stats", async () => {
    const outcome = await award("quest-1", 40);

    expect(outcome).toMatchObject({ awarded: true, xpAwarded: 40, totalXp: 40, level: 1, leveledUp: false });
    expect(outcome.attributes).toEqual([{ attribute: "STRENGTH", amount: 40 }]);

    const ledger = await db.xpTransaction.findFirstOrThrow({ where: { userId, sourceId: src("quest-1") } });
    expect(ledger).toMatchObject({ amount: 40, sourceType: "QUEST_COMPLETION", lifeArea: "PHYSICAL", reason: "Quest quest-1" });
    expect(await totals()).toEqual({ xp: 40, stats: { STRENGTH: 40 } });
  });

  it("never pays twice for the same quest, however many times it is called", async () => {
    const first = await award("quest-dup", 35);
    const second = await award("quest-dup", 35);
    const third = await award("quest-dup", 999);

    expect(first.awarded).toBe(true);
    expect(second).toMatchObject({ awarded: false, xpAwarded: 0 });
    expect(third.awarded).toBe(false);
    expect(await db.xpTransaction.count({ where: { userId, sourceId: src("quest-dup") } })).toBe(1);
  });

  it("survives concurrent double-submits", async () => {
    const results = await Promise.all([award("quest-race", 25), award("quest-race", 25), award("quest-race", 25)]);
    expect(results.filter((r) => r.awarded)).toHaveLength(1);
    expect(await db.xpTransaction.count({ where: { userId, sourceId: src("quest-race") } })).toBe(1);
  });

  it("refuses invalid XP without writing anything", async () => {
    const before = await totals();
    for (const [index, bad] of [0, -50, 2.5, 100_000].entries()) {
      const outcome = await award(`quest-invalid-${index}`, bad);
      expect(outcome).toMatchObject({ awarded: false, xpAwarded: 0 });
    }
    expect(await db.xpTransaction.count({ where: { userId, sourceId: { startsWith: src("quest-invalid") } } })).toBe(0);
    expect((await totals()).xp).toBe(before.xp);
  });

  it("accumulates across many completions and splits stats across attributes", async () => {
    const before = await totals();
    await award("quest-multi-1", 20, "LEARNING");
    await award("quest-multi-2", 30, "SOCIAL");
    const last = await award("quest-multi-3", 20, "LEARNING");

    expect(last.totalXp).toBe(before.xp + 70);
    const after = await totals();
    expect(after.xp).toBe(before.xp + 70);
    // LEARNING splits 70/30 into Intellect and Skills: 2 × (14 + 6).
    expect(after.stats.INTELLECT).toBe(28);
    expect(after.stats.SKILLS).toBe(12);
    expect(after.stats.SOCIAL).toBe(30);
  });

  it("reports a level-up exactly when a boundary is crossed", async () => {
    const fresh = await db.user.create({ data: { handle: `${HANDLE}-levels`, displayName: "Level Tester", timezone: "UTC" } });
    const level2 = xpRequiredForLevel(2); // 100

    const below = await awardXp({
      userId: fresh.id, amount: level2 - 1, sourceType: "QUEST_COMPLETION", sourceId: src("l-1"), lifeArea: "PHYSICAL", reason: "just below",
    });
    expect(below).toMatchObject({ level: 1, previousLevel: 1, leveledUp: false });

    const crossing = await awardXp({
      userId: fresh.id, amount: 1, sourceType: "QUEST_COMPLETION", sourceId: src("l-2"), lifeArea: "PHYSICAL", reason: "the step over",
    });
    expect(crossing).toMatchObject({ level: 2, previousLevel: 1, leveledUp: true, totalXp: level2 });
    expect(crossing.tier).toBe("Beginner");

    // A big award can cross more than one level at once.
    const leap = await awardXp({
      userId: fresh.id, amount: 400, sourceType: "QUEST_COMPLETION", sourceId: src("l-3"), lifeArea: "PHYSICAL", reason: "a big leap",
    });
    expect(leap.leveledUp).toBe(true);
    expect(leap.level).toBeGreaterThan(2);
  });
});

describe("revoking XP", () => {
  it("removes the transaction, its stats, and recalculates the level", async () => {
    const fresh = await db.user.create({ data: { handle: `${HANDLE}-undo`, displayName: "Undo Tester", timezone: "UTC" } });
    await awardXp({ userId: fresh.id, amount: 99, sourceType: "QUEST_COMPLETION", sourceId: src("u-1"), lifeArea: "PHYSICAL", reason: "base" });
    await awardXp({ userId: fresh.id, amount: 40, sourceType: "QUEST_COMPLETION", sourceId: src("u-2"), lifeArea: "PHYSICAL", reason: "tips it over" });

    const outcome = await revokeXp(fresh.id, "QUEST_COMPLETION", src("u-2"));

    expect(outcome).toMatchObject({ xpAwarded: -40, totalXp: 99, level: 1, previousLevel: 2 });
    expect(await db.xpTransaction.count({ where: { userId: fresh.id } })).toBe(1);
    // Stat transactions cascade with their XP transaction.
    expect(await db.statTransaction.aggregate({ where: { userId: fresh.id }, _sum: { amount: true } })).toMatchObject({
      _sum: { amount: 99 },
    });

    // Revoking again is a no-op, and the quest can be re-awarded afterwards.
    expect((await revokeXp(fresh.id, "QUEST_COMPLETION", src("u-2"))).totalXp).toBe(99);
    const reawarded = await awardXp({ userId: fresh.id, amount: 40, sourceType: "QUEST_COMPLETION", sourceId: src("u-2"), lifeArea: "PHYSICAL", reason: "again" });
    expect(reawarded).toMatchObject({ awarded: true, totalXp: 139 });
  });
});
