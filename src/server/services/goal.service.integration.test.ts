import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";

import * as goals from "./goal.service";

/**
 * Exercises the goal system end to end against the real database, through
 * the same service functions the Server Actions call. Uses throwaway users
 * that are removed afterwards; the local user's data is never touched.
 */

const HANDLE = `integration-goals-${Date.now()}`;
let userId: string;
let otherUserId: string;
let goalId: string;

async function roadmap() {
  return db.milestone.findMany({
    where: { goalId },
    orderBy: { order: "asc" },
    include: { missions: { orderBy: { order: "asc" } } },
  });
}

beforeAll(async () => {
  userId = (await db.user.create({ data: { handle: HANDLE, displayName: "Integration" } })).id;
  otherUserId = (await db.user.create({ data: { handle: `${HANDLE}-other`, displayName: "Other" } })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

describe("goal lifecycle", () => {
  it("creates a goal with a generated roadmap and a revision", async () => {
    const goal = await goals.createGoal(userId, {
      title: "Learn Programming",
      lifeArea: "LEARNING",
      motivation: "Build my own tools",
      target: "Ship a small project",
      description: null,
      startingPoint: "NEW",
      deadline: "2027-01-31",
      generateRoadmap: true,
    });
    goalId = goal.id;

    const stored = await db.goal.findUniqueOrThrow({ where: { id: goalId } });
    expect(stored).toMatchObject({ status: "ACTIVE", priority: 0, lifeArea: "LEARNING" });
    expect(stored.deadline?.toISOString().slice(0, 10)).toBe("2027-01-31");

    const milestones = await roadmap();
    expect(milestones.map((m) => m.title)).toEqual(["Fundamentals", "Python", "Problem Solving", "Projects"]);
    expect(milestones.every((m) => m.source === "TEMPLATE" && m.missions.length > 0)).toBe(true);
    expect(milestones.flatMap((m) => m.missions).every((x) => x.goalId === goalId)).toBe(true);

    const revisions = await db.roadmapRevision.findMany({ where: { goalId } });
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ source: "TEMPLATE", generator: "rule-based@1:programming" });
  });

  it("edits goal details", async () => {
    await goals.updateGoal(userId, goalId, {
      title: "Learn programming for real",
      lifeArea: "CAREER",
      motivation: null,
      target: "Build three projects",
      description: "Evenings only",
      startingPoint: "SOME_EXPERIENCE",
      deadline: null,
    });
    const stored = await db.goal.findUniqueOrThrow({ where: { id: goalId } });
    expect(stored).toMatchObject({
      title: "Learn programming for real",
      lifeArea: "CAREER",
      motivation: null,
      deadline: null,
      startingPoint: "SOME_EXPERIENCE",
    });
  });

  it("pauses, resumes, completes and reopens with valid transitions only", async () => {
    await goals.transitionGoal(userId, goalId, "pause");
    expect((await db.goal.findUniqueOrThrow({ where: { id: goalId } })).pausedAt).not.toBeNull();
    await expect(goals.transitionGoal(userId, goalId, "pause")).rejects.toThrow(goals.GoalError);
    await goals.transitionGoal(userId, goalId, "resume");
    await goals.transitionGoal(userId, goalId, "complete");
    const completed = await db.goal.findUniqueOrThrow({ where: { id: goalId } });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
    await goals.transitionGoal(userId, goalId, "reopen");
    expect((await db.goal.findUniqueOrThrow({ where: { id: goalId } })).completedAt).toBeNull();
  });
});

describe("milestones", () => {
  it("adds, edits, reorders and deletes milestones with compact ordering", async () => {
    const added = await goals.addMilestone(userId, goalId, { title: "Deploy", description: "Put it online" });
    expect(added.order).toBe(4);

    await goals.updateMilestone(userId, added.id, { title: "Deploy & share", description: null });
    await goals.moveMilestone(userId, added.id, -1);
    let milestones = await roadmap();
    expect(milestones.map((m) => m.title)).toEqual(["Fundamentals", "Python", "Problem Solving", "Deploy & share", "Projects"]);
    expect(milestones.map((m) => m.order)).toEqual([0, 1, 2, 3, 4]);

    // Moving past the ends is a no-op.
    await goals.moveMilestone(userId, milestones[0].id, -1);
    expect((await roadmap())[0].title).toBe("Fundamentals");

    await goals.deleteMilestone(userId, milestones[1].id);
    milestones = await roadmap();
    expect(milestones.map((m) => m.title)).toEqual(["Fundamentals", "Problem Solving", "Deploy & share", "Projects"]);
    expect(milestones.map((m) => m.order)).toEqual([0, 1, 2, 3]);
    // Cascade removed the deleted milestone's missions.
    expect(await db.mission.count({ where: { goalId, milestone: { title: "Python" } } })).toBe(0);
  });

  it("allows manual status only on milestones without missions", async () => {
    const [withMissions, , empty] = await roadmap();
    await expect(goals.setMilestoneStatus(userId, withMissions.id, "COMPLETED")).rejects.toThrow(/follows its missions/);
    await goals.setMilestoneStatus(userId, empty.id, "COMPLETED");
    const stored = await db.milestone.findUniqueOrThrow({ where: { id: empty.id } });
    expect(stored.status).toBe("COMPLETED");
    expect(stored.completedAt).not.toBeNull();
  });
});

describe("missions", () => {
  it("derives milestone status from mission changes", async () => {
    const fundamentals = (await roadmap())[0];
    const [first, ...rest] = fundamentals.missions;

    await goals.setMissionStatus(userId, first.id, "COMPLETED");
    expect((await db.milestone.findUniqueOrThrow({ where: { id: fundamentals.id } })).status).toBe("IN_PROGRESS");

    for (const mission of rest) await goals.setMissionStatus(userId, mission.id, "SKIPPED");
    const done = await db.milestone.findUniqueOrThrow({ where: { id: fundamentals.id } });
    expect(done.status).toBe("COMPLETED");
    expect(done.completedAt).not.toBeNull();

    await goals.setMissionStatus(userId, first.id, "PENDING");
    expect((await db.milestone.findUniqueOrThrow({ where: { id: fundamentals.id } })).status).toBe("IN_PROGRESS");
  });

  it("adds, edits, reorders and deletes missions", async () => {
    const milestone = (await roadmap())[1];
    const added = await goals.addMission(userId, milestone.id, { title: "Solve a real bakery problem", description: null });
    await goals.updateMission(userId, added.id, { title: "Automate the order list", description: "Spreadsheet first" });
    await goals.moveMission(userId, added.id, -1);

    let missions = (await roadmap())[1].missions;
    expect(missions.at(-2)?.title).toBe("Automate the order list");
    expect(missions.map((m) => m.order)).toEqual(missions.map((_, i) => i));

    await goals.deleteMission(userId, added.id);
    missions = (await roadmap())[1].missions;
    expect(missions.some((m) => m.id === added.id)).toBe(false);
    expect(missions.map((m) => m.order)).toEqual(missions.map((_, i) => i));
  });

  it("drops an in-progress milestone back to pending when its last mission is deleted", async () => {
    const milestone = await goals.addMilestone(userId, goalId, { title: "Scratch", description: null });
    const a = await goals.addMission(userId, milestone.id, { title: "One", description: null });
    const b = await goals.addMission(userId, milestone.id, { title: "Two", description: null });
    await goals.setMissionStatus(userId, a.id, "COMPLETED");
    await goals.deleteMission(userId, a.id);
    await goals.deleteMission(userId, b.id);
    expect((await db.milestone.findUniqueOrThrow({ where: { id: milestone.id } })).status).toBe("PENDING");
    await goals.deleteMilestone(userId, milestone.id);
  });
});

describe("guards", () => {
  it("regenerating replaces the roadmap and records another revision", async () => {
    await expect(goals.generateRoadmap(userId, goalId)).rejects.toThrow(/already has a roadmap/);
    await goals.generateRoadmap(userId, goalId, { replace: true });
    expect(await db.roadmapRevision.count({ where: { goalId } })).toBe(2);
    // SOME_EXPERIENCE (set in the edit test) compresses the foundations.
    expect((await roadmap())[0].missions).toHaveLength(1);
  });

  it("never lets another user touch the goal or its roadmap", async () => {
    const milestone = (await roadmap())[0];
    const mission = milestone.missions[0];
    await expect(goals.updateGoal(otherUserId, goalId, {
      title: "Hijacked", lifeArea: "CAREER", motivation: null, target: null, description: null, startingPoint: "NEW", deadline: null,
    })).rejects.toThrow(/doesn't exist/);
    await expect(goals.transitionGoal(otherUserId, goalId, "pause")).rejects.toThrow(/doesn't exist/);
    await expect(goals.addMilestone(otherUserId, goalId, { title: "Nope", description: null })).rejects.toThrow(/doesn't exist/);
    await expect(goals.deleteMilestone(otherUserId, milestone.id)).rejects.toThrow(/doesn't exist/);
    await expect(goals.setMissionStatus(otherUserId, mission.id, "COMPLETED")).rejects.toThrow(/doesn't exist/);
    await expect(goals.deleteMission(otherUserId, mission.id)).rejects.toThrow(/doesn't exist/);
    expect((await db.goal.findUniqueOrThrow({ where: { id: goalId } })).title).not.toBe("Hijacked");
  });

  it("makes archived goals read-only until restored", async () => {
    await goals.setArchived(userId, goalId, true);
    const milestone = (await roadmap())[0];
    await expect(goals.addMission(userId, milestone.id, { title: "Blocked", description: null })).rejects.toThrow(/archived/);
    await expect(goals.transitionGoal(userId, goalId, "pause")).rejects.toThrow(/archived/);
    await goals.setArchived(userId, goalId, false);
    await goals.addMission(userId, milestone.id, { title: "Allowed again", description: null });
  });

  it("keeps a single major goal", async () => {
    const second = await goals.createGoal(userId, {
      title: "Run a 10k",
      lifeArea: "PHYSICAL",
      motivation: null,
      target: null,
      description: null,
      startingPoint: "NEW",
      deadline: null,
      generateRoadmap: false,
    });
    expect(second.priority).toBe(1);
    expect(await db.milestone.count({ where: { goalId: second.id } })).toBe(0);

    await goals.setMajorGoal(userId, second.id);
    const priorities = await db.goal.findMany({ where: { userId }, select: { id: true, priority: true } });
    expect(priorities.filter((g) => g.priority === 0).map((g) => g.id)).toEqual([second.id]);

    await goals.transitionGoal(userId, second.id, "pause");
    await expect(goals.setMajorGoal(userId, second.id)).rejects.toThrow(/Only active goals/);
  });
});
