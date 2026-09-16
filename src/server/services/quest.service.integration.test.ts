import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { CORE_SLOTS } from "@/modules/quests/categories";
import { db } from "@/server/db";

import * as goals from "./goal.service";
import * as quests from "./quest.service";

/**
 * The Daily Quest system end to end against the real database, through the
 * same service functions the Server Actions call. Throwaway users only.
 */

const HANDLE = `integration-quests-${Date.now()}`;
type TestUser = { id: string; timezone: string };
let user: TestUser;
let other: TestUser;
let goalId: string;

const today = () => todayInTimezone("UTC");
const questsToday = async (u: TestUser) => (await quests.ensureTodaySet(u)).set.quests;
const bySlot = async (u: TestUser, slot: string) => (await questsToday(u)).find((q) => q.slot === slot)!;

/** Moves the user's current day back by one, so the next load is "tomorrow". */
async function advanceOneDay(u: TestUser) {
  const date = parseDateOnly(today());
  const yesterday = new Date(date.getTime() - 86_400_000);
  await db.dailyQuestSet.updateMany({ where: { userId: u.id, date }, data: { date: yesterday } });
}

beforeAll(async () => {
  const created = await db.user.create({
    data: {
      handle: HANDLE,
      displayName: "Quest Tester",
      timezone: "UTC",
      preferences: { create: { dailyMinutes: 60, movementOptions: ["GYM", "WALKING"], learningFormats: ["READING", "AI_LESSONS"] } },
      interests: { create: [{ label: "Guitar", slug: "guitar" }] },
      lifeAreas: { create: [{ lifeArea: "CREATIVITY", isActive: true, isFocus: true, focusRank: 1 }] },
    },
  });
  user = { id: created.id, timezone: "UTC" };
  other = { id: (await db.user.create({ data: { handle: `${HANDLE}-other`, displayName: "Other", timezone: "UTC" } })).id, timezone: "UTC" };

  const goal = await goals.createGoal(user.id, {
    title: "Build an app",
    lifeArea: "CAREER",
    motivation: null,
    target: null,
    description: null,
    startingPoint: "NEW",
    deadline: null,
    generateRoadmap: true,
  });
  goalId = goal.id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

describe("daily generation", () => {
  it("creates one day with all five core categories, safely under concurrent loads", async () => {
    const results = await Promise.all([quests.ensureTodaySet(user), quests.ensureTodaySet(user), quests.ensureTodaySet(user)]);
    expect(new Set(results.map((r) => r.set.id)).size).toBe(1);

    expect(await db.dailyQuestSet.count({ where: { userId: user.id } })).toBe(1);
    const stored = await db.quest.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } });
    expect(stored.filter((q) => q.isCore).map((q) => q.slot)).toEqual([...CORE_SLOTS]);
    expect(new Set(stored.map((q) => q.slot)).size).toBe(stored.length);
    // Creativity focus earns an optional bonus quest.
    expect(stored.find((q) => q.slot === "BONUS")).toMatchObject({ isCore: false, lifeArea: "CREATIVITY" });
  });

  it("persists complete, priced quests and never regenerates on refresh", async () => {
    const first = await questsToday(user);
    for (const quest of first) {
      expect(quest.title.length).toBeGreaterThan(3);
      expect(quest.xpReward).toBeGreaterThan(0);
      expect(quest.estimatedMinutes).toBeGreaterThan(0);
      expect(quest.rationale).toBeTruthy();
      expect(quest.status).toBe("PENDING");
    }
    const set = await db.dailyQuestSet.findFirstOrThrow({ where: { userId: user.id } });
    expect(set).toMatchObject({ generator: "rule-based@1", energy: "NORMAL" });
    expect(formatDateOnly(set.date)).toBe(today());

    const again = await questsToday(user);
    expect(again.map((q) => [q.id, q.templateKey, q.title])).toEqual(first.map((q) => [q.id, q.templateKey, q.title]));
  });

  it("links the personal goal quest to the major goal's next mission", async () => {
    const quest = await bySlot(user, "PERSONAL_GOAL");
    const firstMission = await db.mission.findFirstOrThrow({ where: { goalId }, orderBy: [{ milestone: { order: "asc" } }, { order: "asc" }] });
    expect(quest).toMatchObject({ goalId, missionId: firstMission.id, templateKey: "goal.mission" });
    expect(quest.title).toContain(firstMission.title);
  });
});

describe("quest lifecycle", () => {
  it("starts, completes with reflection and evidence, and can undo", async () => {
    const quest = await bySlot(user, "MENTAL");
    await quests.startQuest(user, quest.id);
    expect(await db.quest.findUniqueOrThrow({ where: { id: quest.id } })).toMatchObject({ status: "IN_PROGRESS" });

    await quests.completeQuest(user, {
      questId: quest.id,
      reflection: "Calmer than expected",
      result: "12 minutes",
      evidenceUrl: "https://example.com/log",
      completeMission: false,
    });
    const completion = await db.questCompletion.findUniqueOrThrow({ where: { questId: quest.id } });
    expect(completion).toMatchObject({ note: "Calmer than expected", result: "12 minutes", evidence: { url: "https://example.com/log" }, xpReward: quest.xpReward });
    await expect(quests.completeQuest(user, { questId: quest.id, reflection: null, result: null, evidenceUrl: null, completeMission: false })).rejects.toThrow(quests.QuestError);

    await quests.saveReflection(user, { questId: quest.id, reflection: "Edited", result: null, evidenceUrl: null });
    expect(await db.questCompletion.findUniqueOrThrow({ where: { questId: quest.id } })).toMatchObject({ note: "Edited", evidence: null });

    await quests.undoCompletion(user, quest.id);
    expect(await db.questCompletion.count({ where: { questId: quest.id } })).toBe(0);
    // It had been started, so it goes back to in progress.
    expect((await db.quest.findUniqueOrThrow({ where: { id: quest.id } })).status).toBe("IN_PROGRESS");

    await quests.completeQuest(user, { questId: quest.id, reflection: null, result: null, evidenceUrl: null, completeMission: false });
    expect((await db.quest.findUniqueOrThrow({ where: { id: quest.id } })).status).toBe("COMPLETED");
  });

  it("skips with a reason and restores", async () => {
    const quest = await bySlot(user, "SOCIAL");
    await quests.skipQuest(user, quest.id, "NO_TIME");
    expect(await db.quest.findUniqueOrThrow({ where: { id: quest.id } })).toMatchObject({ status: "SKIPPED", skipReason: "NO_TIME" });
    await quests.restoreQuest(user, quest.id);
    expect(await db.quest.findUniqueOrThrow({ where: { id: quest.id } })).toMatchObject({ status: "PENDING", skipReason: null, skippedAt: null });
  });

  it("swaps a quest for a different one in the same slot, up to the limit", async () => {
    const before = await bySlot(user, "LEARNING");
    await quests.swapQuest(user, before.id);
    const after = await db.quest.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.templateKey).not.toBe(before.templateKey);
    expect(after.swapCount).toBe(1);
    expect(await db.quest.count({ where: { userId: user.id, slot: "LEARNING" } })).toBe(1);

    await quests.swapQuest(user, before.id);
    await expect(quests.swapQuest(user, before.id)).rejects.toThrow(quests.QuestError);
    const goalQuest = await bySlot(user, "PERSONAL_GOAL");
    await expect(quests.swapQuest(user, goalQuest.id)).rejects.toThrow(quests.QuestError);
  });

  it("completing the goal quest can also finish its mission", async () => {
    const quest = await bySlot(user, "PERSONAL_GOAL");
    await quests.completeQuest(user, { questId: quest.id, reflection: null, result: null, evidenceUrl: null, completeMission: true });
    expect((await db.mission.findUniqueOrThrow({ where: { id: quest.missionId! } })).status).toBe("COMPLETED");
  });

  it("adapts untouched quests to a low-energy check-in and leaves the rest alone", async () => {
    const before = await questsToday(user);
    const physical = before.find((q) => q.slot === "PHYSICAL")!;
    const mental = before.find((q) => q.slot === "MENTAL")!; // completed earlier

    await quests.setDayEnergy(user, "LOW");
    const after = await questsToday(user);
    const set = await db.dailyQuestSet.findFirstOrThrow({ where: { userId: user.id } });
    expect(set.energy).toBe("LOW");

    const lowPhysical = after.find((q) => q.slot === "PHYSICAL")!;
    expect(lowPhysical.id).toBe(physical.id);
    expect(lowPhysical.templateKey).toMatch(/walk|mobility/);
    expect(lowPhysical.estimatedMinutes!).toBeLessThanOrEqual(physical.estimatedMinutes!);
    expect(after.find((q) => q.slot === "MENTAL")).toMatchObject({ id: mental.id, status: "COMPLETED", templateKey: mental.templateKey });
    // Untouched bonus quest is dropped on a low-energy day.
    expect(after.some((q) => q.slot === "BONUS")).toBe(false);
    expect(after.filter((q) => q.isCore)).toHaveLength(5);

    await quests.setDayEnergy(user, "NORMAL");
    expect((await questsToday(user)).some((q) => q.slot === "BONUS")).toBe(true);
  });

  it("never lets another user act on a quest", async () => {
    const quest = await bySlot(user, "PHYSICAL");
    await expect(quests.startQuest(other, quest.id)).rejects.toThrow(/doesn't exist/);
    await expect(quests.completeQuest(other, { questId: quest.id, reflection: null, result: null, evidenceUrl: null, completeMission: false })).rejects.toThrow(/doesn't exist/);
    await expect(quests.saveReflection(other, { questId: quest.id, reflection: "x", result: null, evidenceUrl: null })).rejects.toThrow(/doesn't exist/);
  });
});

describe("the next day", () => {
  it("carries deferred quests, expires unfinished ones and locks the past", async () => {
    const physical = await bySlot(user, "PHYSICAL");
    const social = await bySlot(user, "SOCIAL");
    await quests.startQuest(user, physical.id);
    await quests.deferQuest(user, social.id);

    await advanceOneDay(user);
    const fresh = await questsToday(user);

    expect(await db.dailyQuestSet.count({ where: { userId: user.id } })).toBe(2);
    expect(fresh.filter((q) => q.isCore).map((q) => q.slot)).toEqual([...CORE_SLOTS]);

    // Deferred → offered again, same quest, linked to the original.
    const carried = fresh.find((q) => q.slot === "SOCIAL")!;
    expect(carried).toMatchObject({ carriedFromId: social.id, title: social.title, templateKey: social.templateKey, status: "PENDING" });
    await expect(quests.deferQuest(user, carried.id)).rejects.toThrow(quests.QuestError);

    // Unfinished yesterday → expired; completed and deferred history kept.
    const yesterday = await db.quest.findMany({ where: { dailyQuestSetId: physical.dailyQuestSetId } });
    expect(yesterday.find((q) => q.id === physical.id)?.status).toBe("EXPIRED");
    expect(yesterday.find((q) => q.id === social.id)?.status).toBe("DEFERRED");
    expect(yesterday.find((q) => q.slot === "MENTAL")?.status).toBe("COMPLETED");

    // Yesterday is a record, not a to-do list.
    const oldLearning = yesterday.find((q) => q.slot === "LEARNING")!;
    await expect(quests.completeQuest(user, { questId: oldLearning.id, reflection: null, result: null, evidenceUrl: null, completeMission: false })).rejects.toThrow(/past day/);
    // …but reflections on completed history can still be written.
    const oldMental = yesterday.find((q) => q.slot === "MENTAL")!;
    await quests.saveReflection(user, { questId: oldMental.id, reflection: "Looking back", result: null, evidenceUrl: null });

    // The goal quest moved on to the next mission once the first was finished.
    const goalQuest = fresh.find((q) => q.slot === "PERSONAL_GOAL")!;
    const yesterdayGoal = yesterday.find((q) => q.slot === "PERSONAL_GOAL")!;
    expect(goalQuest.missionId).not.toBe(yesterdayGoal.missionId);
  });
});

describe("quests feed the progression engine", () => {
  it("awards XP once per completion and takes it back on undo", async () => {
    const completions = await db.questCompletion.findMany({ where: { userId: user.id } });
    expect(completions.length).toBeGreaterThan(0);

    // Every completed quest has exactly one matching XP transaction.
    for (const completion of completions) {
      const ledger = await db.xpTransaction.findMany({
        where: { userId: user.id, sourceType: "QUEST_COMPLETION", sourceId: completion.questId },
      });
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount).toBe(completion.xpReward);
    }

    // Quest-sourced XP is exactly the sum of what those completions were
    // worth. (Completions may also unlock achievements — separate source type.)
    const expected = completions.reduce((sum, c) => sum + c.xpReward, 0);
    const total = await db.xpTransaction.aggregate({
      where: { userId: user.id, sourceType: "QUEST_COMPLETION" },
      _sum: { amount: true },
    });
    expect(total._sum.amount).toBe(expected);

    // Stats were awarded alongside, and sum to the same total — achievement
    // XP is area-neutral and moves no stats.
    const stats = await db.statTransaction.aggregate({ where: { userId: user.id }, _sum: { amount: true } });
    expect(stats._sum.amount).toBe(expected);

    // Completing a fresh quest awards XP; undoing it removes the transaction.
    const quest = (await questsToday(user)).find((q) => q.status === "PENDING" && q.slot !== "PERSONAL_GOAL")!;
    await quests.completeQuest(user, { questId: quest.id, reflection: null, result: null, evidenceUrl: null, completeMission: false });
    expect(await db.xpTransaction.count({ where: { userId: user.id, sourceId: quest.id } })).toBe(1);

    await quests.undoCompletion(user, quest.id);
    expect(await db.xpTransaction.count({ where: { userId: user.id, sourceId: quest.id } })).toBe(0);
    const afterUndo = await db.xpTransaction.aggregate({
      where: { userId: user.id, sourceType: "QUEST_COMPLETION" },
      _sum: { amount: true },
    });
    expect(afterUndo._sum.amount).toBe(expected);
  });
});
