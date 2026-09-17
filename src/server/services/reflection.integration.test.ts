import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// AI behaviour is driven through the mock provider, whatever .env says.
vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>();
  return { ...actual, getEnv: () => ({ ...actual.getEnv(), AI_PROVIDER: "mock" as const }) };
});

import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { CORE_SLOTS } from "@/modules/quests/categories";
import { getMockAIProvider, resetAIProviderForTests } from "@/server/ai";
import { db } from "@/server/db";

import * as experiments from "./experiment.service";
import * as journal from "./journal.service";
import * as quests from "./quest.service";
import * as reflections from "./reflection.service";
import { getLifeTimeline } from "./timeline.service";

/**
 * Phase 9 against the real database: a private journal, end-of-day
 * reflections that summarise the day and shape tomorrow, experiments that
 * live inside the daily quest loop, and the life timeline.
 */

const HANDLE = `integration-reflection-${Date.now()}`;
type TestUser = { id: string; timezone: string };
let user: TestUser;
let stranger: TestUser;

const today = () => todayInTimezone("UTC");
const daysAgo = (n: number) => formatDateOnly(new Date(parseDateOnly(today()).getTime() - n * 86_400_000));

/** Moves the user's current day back by one, so the next load is "tomorrow". */
async function advanceOneDay(u: TestUser) {
  const date = parseDateOnly(today());
  await db.dailyQuestSet.updateMany({ where: { userId: u.id, date }, data: { date: new Date(date.getTime() - 86_400_000) } });
  await db.reflection.updateMany({ where: { userId: u.id, date }, data: { date: new Date(date.getTime() - 86_400_000) } });
}

beforeAll(async () => {
  const created = await db.user.create({ data: { handle: HANDLE, displayName: "Reflection Tester", timezone: "UTC" } });
  const other = await db.user.create({ data: { handle: `${HANDLE}-stranger`, displayName: "Stranger", timezone: "UTC" } });
  user = { id: created.id, timezone: "UTC" };
  stranger = { id: other.id, timezone: "UTC" };
});

afterEach(() => resetAIProviderForTests());

afterAll(async () => {
  await db.user.deleteMany({ where: { handle: { startsWith: HANDLE } } });
  await db.$disconnect();
});

describe("private journal", () => {
  let entryId: string;

  it("creates, edits and lists the owner's entries", async () => {
    const entry = await journal.createEntry(user, { title: "A hard week", body: "Honestly, this week was a lot.", mood: "ROUGH", date: today() });
    entryId = entry.id;
    await journal.updateEntry(user, entryId, { title: "A hard week", body: "This week was a lot, but Friday helped.", mood: "OKAY", date: today() });

    const listed = await journal.listEntries(user);
    expect(listed.total).toBe(1);
    expect(listed.entries[0]).toMatchObject({ body: "This week was a lot, but Friday helped.", mood: "OKAY" });
    await expect(journal.createEntry(user, { title: null, body: "From the future", mood: null, date: "2999-01-01" })).rejects.toThrow(/future/);
  });

  it("is invisible and untouchable to anyone else", async () => {
    expect(await journal.getEntry(stranger, entryId)).toBeNull();
    expect((await journal.listEntries(stranger)).total).toBe(0);
    await expect(journal.updateEntry(stranger, entryId, { title: null, body: "hijack", mood: null, date: today() })).rejects.toThrow(/doesn't exist/);
    await expect(journal.deleteEntry(stranger, entryId)).rejects.toThrow(/doesn't exist/);
    expect((await journal.getEntry(user, entryId))!.body).toContain("Friday helped");
  });

  it("never appears on the life timeline", async () => {
    const timeline = await getLifeTimeline(user);
    const text = JSON.stringify(timeline);
    expect(text).not.toContain("Friday helped");
    expect(text).not.toContain("A hard week");
  });
});

describe("daily reflection", () => {
  it("connects to the day's quests and writes a summary from the user's own words when AI is off", async () => {
    const set = (await quests.ensureTodaySet(user)).set;
    const physical = set.quests.find((q) => q.slot === "PHYSICAL")!;
    await quests.completeQuest(user, { questId: physical.id, reflection: "Legs were heavy", result: null, evidenceUrl: null, completeMission: false });

    const saved = await reflections.saveReflection(user, {
      date: today(),
      mood: "ROUGH",
      learned: "Rest is part of training.",
      wentWell: "I still moved.",
      difficult: "Everything felt slow.",
      proud: null,
      differently: "Go to bed before eleven.",
    });
    expect(saved).toMatchObject({ summarySource: "fallback", mood: "ROUGH" });
    expect(saved.aiSummary).toContain("1 of 5 core quests");
    expect(saved.aiSummary).toContain("I still moved.");
    expect(saved.aiSuggestion).toBe("Go to bed before eleven.");

    const day = await reflections.getReflectionDay(user);
    expect(day).toMatchObject({ isToday: true, editable: true });
    expect(day.quests.filter((q) => q.isCore)).toHaveLength(CORE_SLOTS.length);
    expect(day.quests.find((q) => q.id === physical.id)).toMatchObject({ status: "COMPLETED", note: "Legs were heavy" });
  });

  it("keeps one reflection per day — saving again updates it", async () => {
    await reflections.saveReflection(user, { date: today(), mood: "ROUGH", learned: null, wentWell: "Updated", difficult: null, proud: "Showing up", differently: null });
    expect(await db.reflection.count({ where: { userId: user.id, kind: "DAILY" } })).toBe(1);
  });

  it("uses the AI summary when available, with the backend still owning the record", async () => {
    let seen: unknown;
    getMockAIProvider().register("reflections.daily-summary", (request) => {
      seen = request.input;
      return { summary: "You kept moving on a heavy day.", suggestion: "Start tomorrow with a short walk." };
    });
    const saved = await reflections.saveReflection(user, { date: today(), mood: "OKAY", learned: "Pacing", wentWell: null, difficult: null, proud: null, differently: null });
    expect(saved).toMatchObject({ summarySource: "ai", aiSummary: "You kept moving on a heavy day." });
    // Only the reflection and the day's quest record reach the model — never the journal.
    expect(JSON.stringify(seen)).not.toContain("Friday helped");
  });

  it("refuses future days and days beyond the window", async () => {
    await expect(reflections.saveReflection(user, { date: "2999-01-01", mood: "GOOD", learned: null, wentWell: null, difficult: null, proud: null, differently: null })).rejects.toThrow(
      /hasn't happened/,
    );
    await expect(reflections.saveReflection(user, { date: daysAgo(30), mood: "GOOD", learned: null, wentWell: null, difficult: null, proud: null, differently: null })).rejects.toThrow(
      /last 7 days/,
    );
  });

  it("shapes tomorrow: a rough day makes the next day gentler", async () => {
    await reflections.saveReflection(user, { date: today(), mood: "ROUGH", learned: null, wentWell: null, difficult: "Exhausted", proud: null, differently: "Less at once" });
    await advanceOneDay(user);

    const signal = await reflections.reflectionSignalFor(user.id, parseDateOnly(today()));
    expect(signal).toMatchObject({ gentler: true, differently: "Less at once", date: daysAgo(1) });
    const context = await quests.buildContext(user, today(), "NORMAL");
    expect(context.lastReflection).toMatchObject({ gentler: true });

    const tomorrow = (await quests.ensureTodaySet(user)).set;
    expect(tomorrow.rationale).toContain("gentler after a rough day");

    // Older reflections don't linger.
    expect(await reflections.reflectionSignalFor(user.id, parseDateOnly(formatDateOnly(new Date(Date.now() + 5 * 86_400_000))))).toBeNull();
  });
});

describe("experiment mode", () => {
  let experimentId: string;

  it("starting an experiment adds today's practice quest right away", async () => {
    const experiment = await experiments.startTemplateExperiment(user, "photography-7");
    experimentId = experiment.id;

    const set = (await quests.ensureTodaySet(user)).set;
    const practice = set.quests.filter((q) => q.slot.startsWith("EXPERIMENT"));
    expect(practice).toHaveLength(1);
    expect(practice[0]).toMatchObject({ isCore: false, templateKey: "experiment.photography", difficulty: "EASY" });
    expect(practice[0].payload).toMatchObject({ kind: "experiment", experimentId, dayNumber: 1 });

    // Idempotent: loading the day again adds nothing.
    expect((await quests.ensureTodaySet(user)).set.quests.filter((q) => q.slot.startsWith("EXPERIMENT"))).toHaveLength(1);
    await expect(experiments.startTemplateExperiment(user, "photography-7")).rejects.toThrow(/already running/);
  });

  it("survives an energy change — it isn't a generated side quest", async () => {
    await quests.setDayEnergy(user, "LOW");
    expect((await quests.ensureTodaySet(user)).set.quests.filter((q) => q.slot.startsWith("EXPERIMENT"))).toHaveLength(1);
  });

  it("completing the practice quest earns a day and trains the related skill; undo takes both back", async () => {
    const practice = (await quests.ensureTodaySet(user)).set.quests.find((q) => q.slot.startsWith("EXPERIMENT"))!;
    const outcome = await quests.completeQuest(user, { questId: practice.id, reflection: null, result: null, evidenceUrl: null, completeMission: false });
    expect(outcome.experiment).toMatchObject({ daysPracticed: 1 });
    expect(outcome.skill).toMatchObject({ treeSlug: "photography", awarded: true });

    await quests.undoCompletion(user, practice.id);
    expect(await db.experimentDay.count({ where: { experimentId } })).toBe(0);

    await quests.completeQuest(user, { questId: practice.id, reflection: null, result: null, evidenceUrl: null, completeMission: false });
    expect(await db.experimentDay.count({ where: { experimentId } })).toBe(1);
  });

  it("can't be reviewed while running; wrapping up opens the review", async () => {
    await expect(
      experiments.reviewExperiment(user, { experimentId, enjoyment: 4, interest: 5, improvement: "A_LITTLE", decision: "NOT_FOR_NOW", learned: "Light matters" }),
    ).rejects.toThrow(/still running/);
    await experiments.wrapUpExperiment(user, experimentId);
    expect((await experiments.getExperiment(user, experimentId))!.status).toBe("REVIEW_DUE");
  });

  it("the review pays for days tried, can turn the experiment into a goal, and unlocks Curious Mind", async () => {
    const outcome = await experiments.reviewExperiment(user, {
      experimentId,
      enjoyment: 5,
      interest: 5,
      improvement: "NOTICEABLY",
      decision: "MAKE_IT_A_GOAL",
      learned: "I notice light everywhere now.",
    });
    expect(outcome.xpAwarded).toBe(10);
    expect(outcome.goalId).not.toBeNull();
    expect(outcome.achievements.map((a) => a.slug)).toContain("curious-mind");

    const goal = await db.goal.findUniqueOrThrow({ where: { id: outcome.goalId! }, include: { milestones: true } });
    expect(goal).toMatchObject({ title: "Keep going with photography", lifeArea: "CREATIVITY" });
    expect(goal.milestones.length).toBeGreaterThan(0);

    const view = await experiments.getExperiment(user, experimentId);
    expect(view).toMatchObject({ status: "REVIEWED", goal: { id: outcome.goalId } });
    await expect(
      experiments.reviewExperiment(user, { experimentId, enjoyment: 1, interest: 1, improvement: "NOT_REALLY", decision: "NOT_FOR_NOW", learned: "again" }),
    ).rejects.toThrow(/already been reviewed/);
  });

  it("moves to review on its own once the window passes", async () => {
    const experiment = await experiments.startTemplateExperiment(user, "meditation-10");
    await db.experiment.update({ where: { id: experiment.id }, data: { startDate: parseDateOnly(daysAgo(20)) } });
    const overview = await experiments.getExperimentsOverview(user);
    expect(overview.reviewDue.map((e) => e.id)).toContain(experiment.id);
    await experiments.abandonExperiment(user, experiment.id);
    expect((await experiments.getExperiment(user, experiment.id))!.status).toBe("ABANDONED");
  });

  it("belongs to its owner only", async () => {
    expect(await experiments.getExperiment(stranger, experimentId)).toBeNull();
    await expect(experiments.wrapUpExperiment(stranger, experimentId)).rejects.toThrow(/doesn't exist/);
  });
});

describe("life timeline", () => {
  it("tells the story from real records, filterable by kind", async () => {
    const timeline = await getLifeTimeline(user);
    const events = timeline.years.flatMap((year) => year.months.flatMap((month) => month.events));
    const titles = events.map((event) => event.title);

    expect(titles).toContain("Finished the experiment: Try photography for 7 days");
    expect(titles).toContain("Set a goal: Keep going with photography");
    expect(titles).toContain("Started Movement Foundations");
    expect(titles).toContain("Curious Mind");
    expect(timeline.counts.experiment).toBeGreaterThanOrEqual(3);

    const onlyExperiments = await getLifeTimeline(user, ["experiment", "not-a-kind"]);
    expect(onlyExperiments.active).toEqual(["experiment"]);
    expect(onlyExperiments.years.flatMap((y) => y.months.flatMap((m) => m.events)).every((e) => e.kind === "experiment")).toBe(true);
  });
});
