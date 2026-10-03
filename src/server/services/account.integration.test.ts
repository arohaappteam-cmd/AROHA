import { afterAll, describe, expect, it, vi } from "vitest";

import { completeQuestSchema } from "@/modules/quests/schemas";
import { db } from "@/server/db";

import { AccountError, deleteAccount, type DeletionDeps } from "./account.service";
import * as goals from "./goal.service";
import * as quests from "./quest.service";
import * as social from "./social.service";

/**
 * Deleting an account against the real database: everything the person
 * created must be gone afterwards, and the sign-in removed — or nothing
 * deleted at all when the sign-in can't be.
 */

const RUN = Date.now();
const handles: string[] = [];

async function userWithEverything(name: string) {
  const handle = `integration-account-${name}-${RUN}`;
  handles.push(handle);
  const created = await db.user.create({ data: { handle, displayName: name, timezone: "UTC", authId: `auth-${name}-${RUN}` } });
  const user = { ...created };

  await goals.createGoal(user.id, {
    title: "Run a 5k",
    lifeArea: "PHYSICAL",
    motivation: null,
    target: null,
    description: null,
    startingPoint: "NEW",
    deadline: null,
    generateRoadmap: true,
  });
  const { set } = await quests.ensureTodaySet(user);
  await quests.completeQuest(user, completeQuestSchema.parse({ questId: set.quests[0].id, reflection: "Felt good." }));
  await db.journalEntry.create({ data: { userId: user.id, body: "Private thoughts", date: new Date() } });
  await social.saveSocialProfile(user, { ...social.DEFAULT_SOCIAL_PROFILE, visibility: "COMMUNITY" });
  await social.joinGuild(user, "fitness");
  return user;
}

const fakeDeps = (overrides: Partial<DeletionDeps> = {}): DeletionDeps => ({
  authEnabled: () => true,
  canDeleteSignIns: () => true,
  deleteSignIn: vi.fn(async () => {}),
  ...overrides,
});

async function remaining(userId: string) {
  const counts = await Promise.all([
    db.user.count({ where: { id: userId } }),
    db.goal.count({ where: { userId } }),
    db.quest.count({ where: { userId } }),
    db.questCompletion.count({ where: { userId } }),
    db.xpTransaction.count({ where: { userId } }),
    db.journalEntry.count({ where: { userId } }),
    db.socialProfile.count({ where: { userId } }),
    db.guildMembership.count({ where: { userId } }),
    db.character.count({ where: { userId } }),
  ]);
  return counts.reduce((sum, count) => sum + count, 0);
}

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { in: handles } } });
  await db.$disconnect();
});

describe("account deletion", () => {
  it("removes every record and then the sign-in", async () => {
    const user = await userWithEverything("full");
    expect(await remaining(user.id)).toBeGreaterThan(8);

    const deps = fakeDeps();
    await deleteAccount(user, deps);

    expect(await remaining(user.id)).toBe(0);
    expect(deps.deleteSignIn).toHaveBeenCalledWith(user.authId);
  });

  it("deletes nothing when the sign-in can't be removed", async () => {
    const user = await userWithEverything("refused");
    const deps = fakeDeps({ canDeleteSignIns: () => false });

    await expect(deleteAccount(user, deps)).rejects.toThrow(AccountError);
    expect(await remaining(user.id)).toBeGreaterThan(8);
    expect(deps.deleteSignIn).not.toHaveBeenCalled();
  });

  it("says so honestly when the data went but the sign-in didn't, and a retry is safe", async () => {
    const user = await userWithEverything("retry");
    await expect(deleteAccount(user, fakeDeps({ deleteSignIn: async () => Promise.reject(new Error("network")) }))).rejects.toThrow(/data is deleted/);
    expect(await remaining(user.id)).toBe(0);

    // Retrying with nothing left in the database still closes the sign-in.
    const deps = fakeDeps();
    await deleteAccount(user, deps);
    expect(deps.deleteSignIn).toHaveBeenCalledWith(user.authId);
  });

  it("in local mode, clears the data without touching any sign-in", async () => {
    const user = await userWithEverything("local");
    const deps = fakeDeps({ authEnabled: () => false, canDeleteSignIns: () => false });
    await deleteAccount(user, deps);
    expect(await remaining(user.id)).toBe(0);
    expect(deps.deleteSignIn).not.toHaveBeenCalled();
  });
});
