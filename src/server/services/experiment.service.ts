import "server-only";

import type { User } from "@/generated/prisma/client";
import type { LifeArea } from "@/generated/prisma/enums";
import type { UnlockedAchievement } from "@/modules/achievements/catalogue";
import { EXPERIMENT_TEMPLATES, findExperimentTemplate } from "@/modules/experiments/catalogue";
import {
  EXPERIMENT_SLOTS,
  experimentDayNumber,
  experimentProgress,
  experimentQuestContent,
  experimentXpReward,
  MAX_ACTIVE_EXPERIMENTS,
  skillTreeForTopic,
  windowHasEnded,
  type CustomExperimentInput,
  type ExperimentProgress,
  type ExperimentReviewInput,
} from "@/modules/experiments/logic";
import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import type { QuestSlot } from "@/modules/quests/categories";
import { CORE_SLOTS } from "@/modules/quests/categories";
import { readPayload } from "@/modules/quests/payload";
import { questXpReward } from "@/modules/quests/rewards";
import { awardXp } from "@/server/progression/engine";
import { experimentRepository, type ExperimentWithDays } from "@/server/repositories/experiment.repository";
import { questRepository } from "@/server/repositories/quest.repository";
import { checkAchievements } from "@/server/services/achievement.service";
import * as goals from "@/server/services/goal.service";
import { planLimitMessage } from "@/server/services/plan.service";

/**
 * Experiment Mode (spec §41): trying something for a while without
 * committing. An active experiment adds one short quest to each day of its
 * window; completing it earns a practice day and trains the related skill.
 * At the end, the review asks how it went — and can turn it into a goal.
 */

export class ExperimentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExperimentError";
  }
}

type UserLike = Pick<User, "id" | "timezone">;

/** Windows that have passed move to review. Nothing is lost; the days stay earned. */
async function settle(experiments: ExperimentWithDays[], today: string): Promise<ExperimentWithDays[]> {
  const settled: ExperimentWithDays[] = [];
  for (const experiment of experiments) {
    if (experiment.status === "ACTIVE" && windowHasEnded(formatDateOnly(experiment.startDate), experiment.durationDays, today)) {
      await experimentRepository.setStatus(experiment.id, "REVIEW_DUE");
      settled.push({ ...experiment, status: "REVIEW_DUE", endedAt: new Date() });
    } else {
      settled.push(experiment);
    }
  }
  return settled;
}

// ─── Views ───────────────────────────────────────────────────────────────────

export type ExperimentView = {
  id: string;
  templateKey: string;
  title: string;
  topic: string;
  description: string | null;
  emoji: string;
  lifeArea: LifeArea;
  skillTree: string | null;
  durationDays: number;
  dailyMinutes: number;
  status: ExperimentWithDays["status"];
  startDate: string;
  progress: ExperimentProgress;
  practicedToday: boolean;
  review: {
    enjoyment: number | null;
    interest: number | null;
    improvement: ExperimentWithDays["improvement"];
    decision: ExperimentWithDays["decision"];
    learned: string | null;
    reviewedAt: Date | null;
    xpAwarded: number;
  };
  goal: { id: string; title: string } | null;
};

function toView(experiment: ExperimentWithDays, today: string): ExperimentView {
  const startDate = formatDateOnly(experiment.startDate);
  return {
    id: experiment.id,
    templateKey: experiment.templateKey,
    title: experiment.title,
    topic: experiment.topic,
    description: experiment.description,
    emoji: experiment.emoji,
    lifeArea: experiment.lifeArea,
    skillTree: experiment.skillTree,
    durationDays: experiment.durationDays,
    dailyMinutes: experiment.dailyMinutes,
    status: experiment.status,
    startDate,
    progress: experimentProgress({ startDate, durationDays: experiment.durationDays }, experiment.days.length, today),
    practicedToday: experiment.days.some((day) => formatDateOnly(day.date) === today),
    review: {
      enjoyment: experiment.enjoyment,
      interest: experiment.interest,
      improvement: experiment.improvement,
      decision: experiment.decision,
      learned: experiment.learned,
      reviewedAt: experiment.reviewedAt,
      xpAwarded: experiment.xpAwarded,
    },
    goal: experiment.goal,
  };
}

export type ExperimentsOverview = {
  active: ExperimentView[];
  reviewDue: ExperimentView[];
  past: ExperimentView[];
  templates: (typeof EXPERIMENT_TEMPLATES)[number][];
  canStart: boolean;
  /** Set when the user's plan, not the overall cap, is what's full. */
  planLimit: string | null;
};

export async function getExperimentsOverview(user: UserLike): Promise<ExperimentsOverview> {
  const today = todayInTimezone(user.timezone);
  const experiments = (await settle(await experimentRepository.list(user.id), today)).map((e) => toView(e, today));
  const active = experiments.filter((e) => e.status === "ACTIVE");
  const running = new Set(active.map((e) => e.templateKey));
  const planLimit = active.length < MAX_ACTIVE_EXPERIMENTS ? await planLimitMessage(user.id, "activeExperiments", async () => active.length) : null;
  return {
    active,
    reviewDue: experiments.filter((e) => e.status === "REVIEW_DUE"),
    past: experiments.filter((e) => e.status === "REVIEWED" || e.status === "ABANDONED"),
    templates: EXPERIMENT_TEMPLATES.filter((template) => !running.has(template.key)),
    canStart: active.length < MAX_ACTIVE_EXPERIMENTS && !planLimit,
    planLimit,
  };
}

export async function getExperiment(user: UserLike, experimentId: string): Promise<ExperimentView | null> {
  const today = todayInTimezone(user.timezone);
  const experiment = await experimentRepository.findOwned(user.id, experimentId);
  if (!experiment) return null;
  const [settled] = await settle([experiment], today);
  return toView(settled, today);
}

// ─── Daily quests ────────────────────────────────────────────────────────────

/**
 * Makes sure today's set holds one quest per active experiment in its window.
 * Idempotent: an experiment that already has a quest today gets no second one.
 * Returns true when it added anything.
 */
export async function ensureExperimentQuests(user: UserLike, today: string, setId: string): Promise<boolean> {
  const active = (await settle(await experimentRepository.listActive(user.id), today)).filter((e) => e.status === "ACTIVE");
  const existing = await experimentRepository.experimentQuestsInSet(setId);
  const covered = new Set(existing.flatMap((quest) => {
    const payload = readPayload(quest.payload);
    return payload?.kind === "experiment" ? [payload.experimentId] : [];
  }));
  const usedSlots = new Set(existing.map((quest) => quest.slot));

  let added = false;
  for (const experiment of active) {
    if (covered.has(experiment.id)) continue;
    const dayNumber = experimentDayNumber(formatDateOnly(experiment.startDate), experiment.durationDays, today);
    const slot = EXPERIMENT_SLOTS.find((candidate) => !usedSlots.has(candidate));
    if (dayNumber === null || !slot) continue;

    const content = experimentQuestContent(experiment, dayNumber);
    await questRepository.createQuest(user.id, setId, {
      // Experiment slots sit beside the core day; they're never generated or swapped.
      slot: slot as QuestSlot,
      lifeArea: experiment.lifeArea,
      isCore: false,
      templateKey: content.templateKey,
      title: content.title,
      description: content.description,
      steps: content.steps,
      payload: { kind: "experiment", experimentId: experiment.id, dayNumber },
      difficulty: "EASY",
      estimatedMinutes: content.estimatedMinutes,
      rationale: content.rationale,
      goalId: null,
      missionId: null,
      carriedFromId: null,
      xpReward: questXpReward("EASY", content.estimatedMinutes, false),
      sortOrder: CORE_SLOTS.length + 1 + EXPERIMENT_SLOTS.indexOf(slot),
    });
    usedSlots.add(slot);
    added = true;
  }
  return added;
}

/** Removes today's untouched quest for an experiment that's no longer running. */
async function removeTodaysQuest(user: UserLike, experimentId: string) {
  const set = await questRepository.findSet(user.id, parseDateOnly(todayInTimezone(user.timezone)));
  if (!set) return;
  for (const quest of await experimentRepository.experimentQuestsInSet(set.id)) {
    const payload = readPayload(quest.payload);
    if (payload?.kind === "experiment" && payload.experimentId === experimentId && quest.status === "PENDING" && !quest.startedAt) {
      await experimentRepository.deleteQuest(quest.id);
    }
  }
}

async function addTodaysQuest(user: UserLike) {
  const today = todayInTimezone(user.timezone);
  const set = await questRepository.findSet(user.id, parseDateOnly(today));
  // No set yet: the day hasn't started, and the quest arrives with it.
  if (set) await ensureExperimentQuests(user, today, set.id);
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

async function assertCanStart(user: UserLike, templateKey: string | null) {
  const today = todayInTimezone(user.timezone);
  const active = (await settle(await experimentRepository.listActive(user.id), today)).filter((e) => e.status === "ACTIVE");
  if (templateKey && active.some((e) => e.templateKey === templateKey)) throw new ExperimentError("That experiment is already running");
  if (active.length >= MAX_ACTIVE_EXPERIMENTS) {
    throw new ExperimentError("Two experiments at a time is the limit — curiosity works best with room to breathe.");
  }
  const planLimit = await planLimitMessage(user.id, "activeExperiments", async () => active.length);
  if (planLimit) throw new ExperimentError(planLimit);
  return today;
}

export async function startTemplateExperiment(user: UserLike, templateKey: string) {
  const template = findExperimentTemplate(templateKey);
  if (!template) throw new ExperimentError("That experiment doesn't exist");
  const today = await assertCanStart(user, template.key);

  const experiment = await experimentRepository.create({
    userId: user.id,
    templateKey: template.key,
    title: template.title,
    topic: template.topic,
    description: template.description,
    emoji: template.emoji,
    lifeArea: template.lifeArea,
    skillTree: template.skillTree,
    durationDays: template.durationDays,
    dailyMinutes: template.dailyMinutes,
    startDate: parseDateOnly(today),
  });
  await addTodaysQuest(user);
  return experiment;
}

export async function startCustomExperiment(user: UserLike, input: CustomExperimentInput) {
  const today = await assertCanStart(user, null);
  const experiment = await experimentRepository.create({
    userId: user.id,
    templateKey: "custom",
    title: `Try ${input.topic} for ${input.durationDays} days`,
    topic: input.topic,
    description: `${input.dailyMinutes} minutes a day of ${input.topic}, to see whether it's for you.`,
    emoji: "🧪",
    lifeArea: input.lifeArea,
    skillTree: skillTreeForTopic(input.topic),
    durationDays: input.durationDays,
    dailyMinutes: input.dailyMinutes,
    startDate: parseDateOnly(today),
  });
  await addTodaysQuest(user);
  return experiment;
}

async function requireExperiment(user: UserLike, experimentId: string) {
  const experiment = await experimentRepository.findOwned(user.id, experimentId);
  if (!experiment) throw new ExperimentError("That experiment doesn't exist");
  return experiment;
}

/** Enough to know? Wrap up now and go straight to the review. */
export async function wrapUpExperiment(user: UserLike, experimentId: string) {
  const experiment = await requireExperiment(user, experimentId);
  if (experiment.status !== "ACTIVE") throw new ExperimentError("Only a running experiment can be wrapped up");
  await experimentRepository.setStatus(experiment.id, "REVIEW_DUE");
  await removeTodaysQuest(user, experiment.id);
}

export async function abandonExperiment(user: UserLike, experimentId: string) {
  const experiment = await requireExperiment(user, experimentId);
  if (experiment.status !== "ACTIVE" && experiment.status !== "REVIEW_DUE") {
    throw new ExperimentError("That experiment is already finished");
  }
  await experimentRepository.setStatus(experiment.id, "ABANDONED");
  await removeTodaysQuest(user, experiment.id);
}

export type ExperimentReviewOutcome = {
  xpAwarded: number;
  goalId: string | null;
  achievements: UnlockedAchievement[];
};

export async function reviewExperiment(user: UserLike, input: ExperimentReviewInput): Promise<ExperimentReviewOutcome> {
  const today = todayInTimezone(user.timezone);
  const [experiment] = await settle([await requireExperiment(user, input.experimentId)], today);
  if (experiment.status !== "REVIEW_DUE") {
    throw new ExperimentError(
      experiment.status === "ACTIVE" ? "The experiment is still running — wrap it up first if you already know." : "This experiment has already been reviewed",
    );
  }

  const daysPracticed = experiment.days.length;
  let xpAwarded = 0;
  const reward = experimentXpReward(daysPracticed);
  if (reward > 0) {
    const outcome = await awardXp({
      userId: user.id,
      amount: reward,
      sourceType: "EXPERIMENT_COMPLETION",
      sourceId: experiment.id,
      lifeArea: experiment.lifeArea,
      reason: `Experiment reviewed: ${experiment.title}`,
    });
    xpAwarded = outcome.xpAwarded;
  }

  let goalId: string | null = null;
  if (input.decision === "MAKE_IT_A_GOAL") {
    const goal = await goals.createGoal(user.id, {
      title: `Keep going with ${experiment.topic}`.slice(0, 100),
      lifeArea: experiment.lifeArea,
      motivation: input.learned.slice(0, 500),
      target: null,
      description: `Grew out of a ${experiment.durationDays}-day experiment with ${daysPracticed} day${daysPracticed === 1 ? "" : "s"} of practice.`,
      startingPoint: daysPracticed >= 3 ? "SOME_EXPERIENCE" : "NEW",
      deadline: null,
      generateRoadmap: true,
    });
    goalId = goal.id;
  }

  await experimentRepository.review(experiment.id, {
    enjoyment: input.enjoyment,
    interest: input.interest,
    improvement: input.improvement,
    decision: input.decision,
    learned: input.learned,
    xpAwarded,
    goalId,
  });

  let achievements: UnlockedAchievement[] = [];
  try {
    achievements = await checkAchievements(user.id);
  } catch (error) {
    console.error("Achievement check failed after experiment review", experiment.id, error);
  }
  return { xpAwarded, goalId, achievements };
}

// ─── Quest integration ───────────────────────────────────────────────────────

/** Credits a practice day when an experiment's quest is completed. */
export async function questCompleted(event: { userId: string; timezone: string; questId: string; payload: unknown }): Promise<{ experimentTitle: string; daysPracticed: number } | null> {
  const payload = readPayload(event.payload);
  if (payload?.kind !== "experiment") return null;

  const experiment = await experimentRepository.findOwned(event.userId, payload.experimentId);
  if (!experiment || experiment.status !== "ACTIVE") return null;

  const today = todayInTimezone(event.timezone);
  const credited = await experimentRepository.creditDay(experiment.id, event.userId, parseDateOnly(today), event.questId);
  return { experimentTitle: experiment.title, daysPracticed: experiment.days.length + (credited ? 1 : 0) };
}

export async function questCompletionReverted(userId: string, questId: string): Promise<void> {
  await experimentRepository.removeCreditsForQuest(userId, questId);
}
