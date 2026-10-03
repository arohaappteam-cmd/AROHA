import "server-only";

import { Prisma, type User } from "@/generated/prisma/client";
import type { DayEnergy, LifeArea, QuestStatus } from "@/generated/prisma/enums";
import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { nextStep } from "@/modules/goals/progress";
import { CORE_DAILY_LIFE_AREAS, focusAreas, resolveLifeAreas } from "@/modules/identity/life-areas";
import { DEFAULT_PREFERENCES } from "@/modules/identity/preferences";
import { CORE_SLOTS, type QuestSlot } from "@/modules/quests/categories";
import {
  questDraftSchema,
  type CarryOver,
  type QuestDraft,
  type QuestGenerationContext,
  type QuestGenerator,
} from "@/modules/quests/context";
import { tagsOf } from "@/modules/quests/generator";
import { baseTemplateKey } from "@/modules/quests/templates";
import { readPayload } from "@/modules/quests/payload";
import { questXpReward } from "@/modules/quests/rewards";
import type { CompleteQuestInput, ReflectionInput } from "@/modules/quests/schemas";
import { can, type QuestAction } from "@/modules/quests/status";
import { selectQuestGenerator } from "@/server/ai/quest-generator";
import { progression } from "@/server/progression/port";
import { goalRepository } from "@/server/repositories/goal.repository";
import { identityRepository } from "@/server/repositories/identity.repository";
import { questRepository, type PricedDraft } from "@/server/repositories/quest.repository";
import * as achievements from "@/server/services/achievement.service";
import * as challenges from "@/server/services/challenge.service";
import * as experiments from "@/server/services/experiment.service";
import * as goals from "@/server/services/goal.service";
import { reflectionSignalFor } from "@/server/services/reflection.service";
import * as skills from "@/server/services/skill.service";

/** Business-rule failures that are safe to show to the user. */
export class QuestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestError";
  }
}

/** Days of history used to avoid repeating the same quests. */
const RECENT_DAYS = 3;

/**
 * The generator for new days. AI-backed when configured, deterministic
 * otherwise; either way, drafts pass the same validation and XP is priced
 * here (spec §6 — the backend owns progression).
 */
function questGenerator(): QuestGenerator {
  return selectQuestGenerator();
}

function price(draft: QuestDraft, sortOrder: number): PricedDraft {
  const valid = questDraftSchema.parse(draft) as unknown as QuestDraft;
  return {
    ...valid,
    xpReward: questXpReward(valid.difficulty, valid.estimatedMinutes, valid.isCore),
    sortOrder,
  };
}

function sortOrderFor(slot: QuestSlot) {
  const index = CORE_SLOTS.indexOf(slot as (typeof CORE_SLOTS)[number]);
  return index === -1 ? CORE_SLOTS.length : index;
}

/** Rebuilds a stored quest as a draft, so a deferred quest can be carried. */
function toDraft(quest: {
  slot: string;
  lifeArea: QuestDraft["lifeArea"];
  isCore: boolean;
  templateKey: string;
  title: string;
  description: string | null;
  steps: string[];
  payload: unknown;
  difficulty: QuestDraft["difficulty"];
  estimatedMinutes: number | null;
  rationale: string | null;
  goalId: string | null;
  missionId: string | null;
}): QuestDraft {
  return {
    slot: quest.slot as QuestSlot,
    lifeArea: quest.lifeArea,
    isCore: quest.isCore,
    templateKey: quest.templateKey,
    title: quest.title,
    description: quest.description ?? "",
    steps: quest.steps,
    payload: readPayload(quest.payload),
    difficulty: quest.difficulty,
    estimatedMinutes: quest.estimatedMinutes ?? 10,
    rationale: quest.rationale ?? "",
    goalId: quest.goalId,
    missionId: quest.missionId,
    carriedFromId: null,
  };
}

export async function buildContext(user: Pick<User, "id" | "timezone">, date: string, energy: DayEnergy): Promise<QuestGenerationContext> {
  const day = parseDateOnly(date);
  const recentFrom = parseDateOnly(formatDateOnly(new Date(day.getTime() - RECENT_DAYS * 86_400_000)));

  const [preferences, interests, lifeAreaRows, majorGoal, previousSet, recent, lastReflection] = await Promise.all([
    identityRepository.findPreferences(user.id),
    identityRepository.listInterests(user.id),
    identityRepository.listLifeAreas(user.id),
    goalRepository.findMajorGoal(user.id),
    questRepository.findPreviousSet(user.id, day),
    questRepository.recentQuests(user.id, recentFrom, day),
    reflectionSignalFor(user.id, day),
  ]);

  const previousOutcomes: Partial<Record<QuestSlot, QuestStatus>> = {};
  const carryOvers: CarryOver[] = [];
  if (previousSet) {
    for (const quest of previousSet.quests) {
      previousOutcomes[quest.slot as QuestSlot] = quest.status;
      const stillRelevant =
        quest.slot !== "PERSONAL_GOAL" ||
        (quest.mission?.status === "PENDING" && quest.goal?.status === "ACTIVE" && !quest.goal.archivedAt);
      if (quest.status === "DEFERRED" && quest.isCore && !quest.carriedTo && stillRelevant) {
        carryOvers.push({ questId: quest.id, draft: toDraft(quest) });
      }
    }
  }

  return {
    userId: user.id,
    date,
    energy,
    preferences: preferences
      ? {
          dailyMinutes: preferences.dailyMinutes,
          preferredTimeOfDay: preferences.preferredTimeOfDay,
          challengeLevel: preferences.challengeLevel,
          movementOptions: preferences.movementOptions,
          learningFormats: preferences.learningFormats,
        }
      : { ...DEFAULT_PREFERENCES },
    interests: interests.map((i) => ({ label: i.label, lifeArea: i.lifeArea })),
    focusAreas: focusAreas(resolveLifeAreas(lifeAreaRows)).map((a) => a.key),
    majorGoal: majorGoal
      ? (() => {
          const step = nextStep(majorGoal.milestones);
          return {
            id: majorGoal.id,
            title: majorGoal.title,
            hasRoadmap: majorGoal.milestones.length > 0,
            next: step
              ? { milestoneTitle: step.milestone.title, missionId: step.mission?.id ?? null, missionTitle: step.mission?.title ?? null }
              : null,
          };
        })()
      : null,
    recentTemplateKeys: recent.map((q) => q.templateKey),
    previousOutcomes,
    carryOvers,
    lastReflection,
  };
}

/**
 * Today's quest set, generated on first access. Idempotent: refreshing or
 * loading from two tabs at once never creates a second day or new quests.
 */
export async function ensureTodaySet(user: Pick<User, "id" | "timezone">) {
  const today = todayInTimezone(user.timezone);
  const date = parseDateOnly(today);

  const existing = await questRepository.findSet(user.id, date);
  if (existing) {
    // Experiments started since the day was created still get today's quest.
    const added = await experiments.ensureExperimentQuests(user, today, existing.id);
    return { set: added ? (await questRepository.findSet(user.id, date))! : existing, today };
  }

  const context = await buildContext(user, today, "NORMAL");
  const generated = await questGenerator().generateDay(context);
  const drafts = generated.drafts.map((draft) => price(draft, sortOrderFor(draft.slot)));

  try {
    await questRepository.createDay(user.id, date, { rationale: generated.rationale, generator: generated.generator, energy: "NORMAL" }, drafts);
  } catch (error) {
    const raced = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!raced) throw error;
  }

  const created = await questRepository.findSet(user.id, date);
  if (!created) throw new Error("Daily quest set could not be created");
  if (await experiments.ensureExperimentQuests(user, today, created.id)) {
    return { set: (await questRepository.findSet(user.id, date))!, today };
  }
  return { set: created, today };
}

// ─── Quest lifecycle ────────────────────────────────────────────────────────

async function requireQuest(user: Pick<User, "id" | "timezone">, questId: string, action: QuestAction) {
  const quest = await questRepository.findQuestOwned(user.id, questId);
  if (!quest || !quest.dailyQuestSet) throw new QuestError("That quest doesn't exist");
  const isToday = formatDateOnly(quest.dailyQuestSet.date) === todayInTimezone(user.timezone);
  if (!can(quest, action, isToday)) {
    throw new QuestError(isToday ? "That isn't possible for this quest right now" : "This quest belongs to a past day");
  }
  return quest;
}

function evidenceJson(url: string | null) {
  return url ? { url } : undefined;
}

export async function startQuest(user: Pick<User, "id" | "timezone">, questId: string) {
  await requireQuest(user, questId, "start");
  await questRepository.update(questId, { status: "IN_PROGRESS", startedAt: new Date() });
}

export async function completeQuest(user: Pick<User, "id" | "timezone">, input: CompleteQuestInput) {
  const quest = await requireQuest(user, input.questId, "complete");
  const completion = await questRepository.complete(quest.id, user.id, quest.xpReward, {
    note: input.reflection,
    result: input.result,
    evidence: evidenceJson(input.evidenceUrl),
  });

  let missionCompleted = false;
  if (input.completeMission && quest.missionId && quest.mission?.status === "PENDING") {
    try {
      await goals.setMissionStatus(user.id, quest.missionId, "COMPLETED");
      missionCompleted = true;
    } catch (error) {
      // The quest still counts even if the goal can't change (e.g. archived).
      if (!(error instanceof goals.GoalError)) throw error;
    }
  }

  const outcome = await progression().questCompleted({
    userId: user.id,
    questId: quest.id,
    completionId: completion.id,
    lifeArea: quest.lifeArea,
    difficulty: quest.difficulty,
    xpReward: quest.xpReward,
    completedAt: completion.completedAt,
    title: quest.title,
  });

  // Skills, challenges and achievements ride on top of the completion; none
  // of them may ever block it.
  let skill: Awaited<ReturnType<typeof skills.questCompleted>> = null;
  try {
    skill = await skills.questCompleted({
      userId: user.id,
      questId: quest.id,
      lifeArea: quest.lifeArea,
      templateKey: quest.templateKey,
      title: quest.title,
      goalTitle: quest.goal?.title ?? null,
      xpReward: quest.xpReward,
    });
  } catch (error) {
    console.error("Skill award failed for quest", quest.id, error);
  }

  let challengeOutcome: Awaited<ReturnType<typeof challenges.questCompleted>> | null = null;
  try {
    challengeOutcome = await challenges.questCompleted({
      userId: user.id,
      timezone: user.timezone,
      questId: quest.id,
      lifeArea: quest.lifeArea,
      templateKey: baseTemplateKey(quest.templateKey),
      skillTree: skill?.treeSlug ?? null,
    });
  } catch (error) {
    console.error("Challenge credit failed for quest", quest.id, error);
  }

  let experiment: Awaited<ReturnType<typeof experiments.questCompleted>> = null;
  try {
    experiment = await experiments.questCompleted({ userId: user.id, timezone: user.timezone, questId: quest.id, payload: quest.payload });
  } catch (error) {
    console.error("Experiment credit failed for quest", quest.id, error);
  }

  let unlocked: Awaited<ReturnType<typeof achievements.checkAchievements>> = [];
  try {
    unlocked = await achievements.checkAchievements(user.id);
  } catch (error) {
    console.error("Achievement check failed for quest", quest.id, error);
  }

  return {
    missionCompleted,
    progression: outcome,
    skill,
    challenges: challengeOutcome,
    experiment,
    achievements: unlocked,
    day: quest.dailyQuestSet ? dayByArea(await questRepository.setTally(quest.dailyQuestSet.id)) : [],
    lifeArea: quest.lifeArea,
  };
}

/** The day's quests per area, core areas first and always present. */
function dayByArea(quests: readonly { lifeArea: LifeArea; status: QuestStatus }[]) {
  const areas = [...CORE_DAILY_LIFE_AREAS, ...new Set(quests.map((entry) => entry.lifeArea).filter((area) => !CORE_DAILY_LIFE_AREAS.includes(area)))];
  return areas.map((lifeArea) => {
    const mine = quests.filter((entry) => entry.lifeArea === lifeArea);
    return { lifeArea, completed: mine.filter((entry) => entry.status === "COMPLETED").length, offered: mine.length };
  });
}

/** Add or edit the reflection on a completed quest (any day — it's the user's record). */
export async function saveReflection(user: Pick<User, "id" | "timezone">, input: ReflectionInput) {
  const quest = await questRepository.findQuestOwned(user.id, input.questId);
  if (!quest) throw new QuestError("That quest doesn't exist");
  if (quest.status !== "COMPLETED" || !quest.completion) throw new QuestError("Complete the quest before adding a reflection");
  await questRepository.updateCompletion(quest.id, {
    note: input.reflection,
    result: input.result,
    evidence: evidenceJson(input.evidenceUrl) ?? Prisma.DbNull,
  });
}

export async function undoCompletion(user: Pick<User, "id" | "timezone">, questId: string) {
  const quest = await requireQuest(user, questId, "undo");
  await questRepository.undoCompletion(quest.id, quest.startedAt ? "IN_PROGRESS" : "PENDING");
  await progression().questCompletionReverted({ userId: user.id, questId: quest.id });
  await skills.questCompletionReverted(user.id, quest.id);
  // Challenge credit is withdrawn too; achievements, once earned, stay earned.
  await challenges.questCompletionReverted(user, quest.id);
  await experiments.questCompletionReverted(user.id, quest.id);
}

export async function skipQuest(user: Pick<User, "id" | "timezone">, questId: string, reason: string) {
  await requireQuest(user, questId, "skip");
  await questRepository.update(questId, { status: "SKIPPED", skippedAt: new Date(), skipReason: reason });
}

export async function deferQuest(user: Pick<User, "id" | "timezone">, questId: string) {
  await requireQuest(user, questId, "defer");
  await questRepository.update(questId, { status: "DEFERRED" });
}

export async function restoreQuest(user: Pick<User, "id" | "timezone">, questId: string) {
  const quest = await requireQuest(user, questId, "restore");
  await questRepository.update(questId, {
    status: quest.startedAt ? "IN_PROGRESS" : "PENDING",
    skippedAt: null,
    skipReason: null,
  });
}

/** Replaces a quest with a different one for the same slot. */
export async function swapQuest(user: Pick<User, "id" | "timezone">, questId: string) {
  const quest = await requireQuest(user, questId, "swap");
  const set = await questRepository.findSet(user.id, quest.dailyQuestSet!.date);
  const others = set?.quests.filter((q) => q.id !== quest.id) ?? [];

  const context = await buildContext(user, formatDateOnly(quest.dailyQuestSet!.date), quest.dailyQuestSet!.energy);
  const draft = await questGenerator().generateSlot(context, quest.slot as QuestSlot, {
    nonce: quest.swapCount + 1,
    excludeTemplateKeys: [quest.templateKey],
    avoidTags: others.flatMap((q) => tagsOf(q.templateKey)),
  });
  if (!draft) throw new QuestError("There isn't another quest that fits you here right now");

  await questRepository.replaceContent(quest.id, price(draft, quest.sortOrder), {
    swapCount: quest.swapCount + 1,
    rationale: `Swapped in for “${quest.title}”. ${draft.rationale}`.slice(0, 240),
  });
}

/**
 * Energy check-in (spec §55). Untouched quests are regenerated for the new
 * energy level; anything started, completed, swapped or carried stays as is.
 */
export async function setDayEnergy(user: Pick<User, "id" | "timezone">, energy: DayEnergy) {
  const { set, today } = await ensureTodaySet(user);
  if (set.energy === energy) return;

  const context = await buildContext(user, today, energy);
  const generated = await questGenerator().generateDay(context);
  const byslot = new Map(generated.drafts.map((d) => [d.slot, d]));
  const untouched = (q: (typeof set.quests)[number]) =>
    q.status === "PENDING" && !q.startedAt && !q.carriedFromId && q.swapCount === 0;

  for (const quest of set.quests) {
    if (!untouched(quest)) continue;
    const draft = byslot.get(quest.slot as QuestSlot);
    if (draft) {
      await questRepository.replaceContent(quest.id, price(draft, quest.sortOrder));
    } else if (quest.slot === "BONUS") {
      // e.g. no bonus quest on a low-energy day. Experiment quests always stay.
      await questRepository.deleteQuest(quest.id);
    }
  }

  const bonus = byslot.get("BONUS");
  if (bonus && !set.quests.some((q) => q.slot === "BONUS")) {
    await questRepository.createQuest(user.id, set.id, price(bonus, sortOrderFor("BONUS")));
  }

  await questRepository.updateSet(set.id, { energy, rationale: generated.rationale });
}
