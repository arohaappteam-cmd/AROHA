import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { db } from "@/server/db";

import { checkAchievements, ensureAchievementCatalogue, getAchievementsView } from "./achievement.service";
import * as challenges from "./challenge.service";
import { getStreaks } from "./streak.service";

/**
 * The motivation systems against the real database: challenge lifecycle and
 * idempotent day credits, XP on completion, exact undo, deterministic
 * achievement unlocks, and derived streaks.
 */

const HANDLE = `integration-motivation-${Date.now()}`;
let userId: string;
let user: { id: string; timezone: string };

const readingQuest = (questId: string) => ({
  userId,
  timezone: "UTC",
  questId,
  lifeArea: "LEARNING" as const,
  templateKey: "learning.reading",
  skillTree: null,
});

beforeAll(async () => {
  const created = await db.user.create({ data: { handle: HANDLE, displayName: "Motivation Tester", timezone: "UTC" } });
  userId = created.id;
  user = { id: created.id, timezone: created.timezone };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

describe("challenges", () => {
  it("starts with backend-priced targets, enforces one per template and the active cap", async () => {
    const reading = await challenges.startChallenge(user, "reading-7");
    expect(reading).toMatchObject({ templateKey: "reading-7", durationDays: 7, targetDays: 6, xpReward: 90, status: "ACTIVE" });

    await expect(challenges.startChallenge(user, "reading-7")).rejects.toThrow(/already running/);
    await challenges.startChallenge(user, "fitness-30");
    await expect(challenges.startChallenge(user, "coding-14")).rejects.toThrow(/Two challenges/);
    await expect(challenges.startChallenge(user, "no-such")).rejects.toThrow(/doesn't exist/);
  });

  it("credits one day per matching quest day, idempotently", async () => {
    const first = await challenges.questCompleted(readingQuest("q-read-1"));
    expect(first.credited).toHaveLength(1);
    expect(first.credited[0]).toMatchObject({ title: "7-Day Reading", daysDone: 1, targetDays: 6, completed: false, xpAwarded: 0 });

    // A second reading quest the same day earns nothing new.
    const again = await challenges.questCompleted(readingQuest("q-read-2"));
    expect(again.credited).toHaveLength(0);

    // A physical quest feeds the fitness challenge, not the reading one.
    const physical = await challenges.questCompleted({
      userId,
      timezone: "UTC",
      questId: "q-walk-1",
      lifeArea: "PHYSICAL",
      templateKey: "physical.walk",
      skillTree: "fitness",
    });
    expect(physical.credited).toHaveLength(1);
    expect(physical.credited[0].title).toBe("30-Day Fitness");
  });

  it("setting a challenge down keeps its days and frees a slot", async () => {
    const overview = await challenges.getChallengesOverview(user);
    const fitness = overview.active.find((challenge) => challenge.templateKey === "fitness-30")!;
    await challenges.abandonChallenge(user, fitness.id);

    const after = await challenges.getChallengesOverview(user);
    expect(after.active.map((challenge) => challenge.templateKey)).toEqual(["reading-7"]);
    const past = after.past.find((challenge) => challenge.id === fitness.id)!;
    expect(past).toMatchObject({ status: "ABANDONED" });
    expect(past.progress.daysDone).toBe(1);
    expect(after.canStart).toBe(true);
  });

  it("completes a challenge at its target, awards the bonus once, and undoes exactly", async () => {
    // A 2-day build challenge, started yesterday with yesterday already earned.
    const created = await challenges.startChallenge(user, "create-48h");
    const today = todayInTimezone("UTC");
    const yesterday = formatDateOnly(new Date(parseDateOnly(today).getTime() - 86_400_000));
    await db.challenge.update({ where: { id: created.id }, data: { startDate: parseDateOnly(yesterday) } });
    await db.challengeDay.create({ data: { challengeId: created.id, userId, date: parseDateOnly(yesterday), questId: "q-make-0" } });

    const outcome = await challenges.questCompleted({
      userId,
      timezone: "UTC",
      questId: "q-make-1",
      lifeArea: "CREATIVITY",
      templateKey: "bonus.create",
      skillTree: null,
    });
    const credit = outcome.credited.find((entry) => entry.id === created.id)!;
    expect(credit).toMatchObject({ completed: true, daysDone: 2, xpAwarded: 30 });

    const bonus = await db.xpTransaction.findFirst({ where: { userId, sourceType: "CHALLENGE_COMPLETION", sourceId: created.id } });
    expect(bonus).toMatchObject({ amount: 30 });

    // Undoing today's quest removes its credit, reverts the challenge, revokes the bonus.
    await challenges.questCompletionReverted(user, "q-make-1");
    const reverted = await db.challenge.findUniqueOrThrow({ where: { id: created.id } });
    expect(reverted.status).toBe("ACTIVE"); // window (yesterday+today) still open
    expect(await db.challengeDay.count({ where: { challengeId: created.id } })).toBe(1);
    expect(await db.xpTransaction.count({ where: { userId, sourceType: "CHALLENGE_COMPLETION", sourceId: created.id } })).toBe(0);

    // Redoing the quest completes it again.
    const redo = await challenges.questCompleted({
      userId,
      timezone: "UTC",
      questId: "q-make-1",
      lifeArea: "CREATIVITY",
      templateKey: "bonus.create",
      skillTree: null,
    });
    expect(redo.credited.find((entry) => entry.id === created.id)).toMatchObject({ completed: true });
  });
});

describe("achievements", () => {
  it("unlocks deterministically from real counts, awards XP once, never twice", async () => {
    await ensureAchievementCatalogue();

    // No completions yet → nothing unlocks.
    expect(await checkAchievements(userId)).toEqual([]);

    const quest = await db.quest.create({
      data: {
        userId,
        slot: "LEARNING",
        lifeArea: "LEARNING",
        templateKey: "learning.reading",
        title: "Read 10 pages",
        xpReward: 20,
        source: "SYSTEM",
        status: "COMPLETED",
      },
    });
    await db.questCompletion.create({ data: { questId: quest.id, userId, xpReward: 20 } });

    const unlocked = await checkAchievements(userId);
    expect(unlocked.map((achievement) => achievement.slug)).toEqual(["first-quest"]);
    expect(unlocked[0]).toMatchObject({ name: "First Quest", xpReward: 25 });

    const xp = await db.xpTransaction.findMany({ where: { userId, sourceType: "ACHIEVEMENT" } });
    expect(xp).toHaveLength(1);
    expect(xp[0]).toMatchObject({ amount: 25, lifeArea: null });
    // Area-neutral: achievement XP moves no stats.
    expect(await db.statTransaction.count({ where: { xpTransactionId: xp[0].id } })).toBe(0);

    // Checking again unlocks nothing and pays nothing.
    expect(await checkAchievements(userId)).toEqual([]);
    expect(await db.userAchievement.count({ where: { userId } })).toBe(1);
    expect(await db.xpTransaction.count({ where: { userId, sourceType: "ACHIEVEMENT" } })).toBe(1);
  });

  it("unlocks the 7-day challenge achievement from a completed 7-day window", async () => {
    const overview = await challenges.getChallengesOverview(user);
    const reading = overview.active.find((challenge) => challenge.templateKey === "reading-7")!;
    await db.challenge.update({ where: { id: reading.id }, data: { status: "COMPLETED", completedAt: new Date() } });

    const unlocked = await checkAchievements(userId);
    expect(unlocked.map((achievement) => achievement.slug)).toContain("challenge-7");
    expect(unlocked.map((achievement) => achievement.slug)).not.toContain("challenge-30");
  });

  it("keeps achievements even when the action behind them is undone", async () => {
    await db.questCompletion.deleteMany({ where: { userId } });
    expect(await checkAchievements(userId)).toEqual([]); // nothing new — and nothing lost
    const view = await getAchievementsView(userId);
    expect(view.find((achievement) => achievement.slug === "first-quest")!.unlockedAt).not.toBeNull();
  });
});

describe("streaks", () => {
  it("derives streaks from completions in the user's timezone", async () => {
    const quest = await db.quest.create({
      data: {
        userId,
        slot: "PHYSICAL",
        lifeArea: "PHYSICAL",
        templateKey: "physical.walk",
        title: "Walk",
        xpReward: 20,
        source: "SYSTEM",
        status: "COMPLETED",
      },
    });
    await db.questCompletion.create({ data: { questId: quest.id, userId, xpReward: 20 } });

    const streaks = await getStreaks(user);
    const byKey = new Map(streaks.map((streak) => [streak.key, streak]));
    expect(byKey.get("exercise")).toMatchObject({ current: 1, activeToday: true, lifetimeDays: 1 });
    expect(byKey.get("showing-up")).toMatchObject({ current: 1 });
    expect(byKey.get("reading")).toMatchObject({ current: 0 }); // its completion was undone above
  });
});
