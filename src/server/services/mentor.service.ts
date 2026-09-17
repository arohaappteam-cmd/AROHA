import "server-only";

import type { User } from "@/generated/prisma/client";
import type { LifeArea } from "@/generated/prisma/enums";
import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { computeRoadmapProgress, goalPercent, nextStep } from "@/modules/goals/progress";
import { interestSlug } from "@/modules/identity/interests";
import { DEFAULT_PREFERENCES } from "@/modules/identity/preferences";
import { getLevelProgress, tierForLevel } from "@/modules/progression";
import { fallbackInsights } from "@/modules/mentor/fallbacks";
import { discoveryPrompt, insightsPrompt, MENTOR_SYSTEM } from "@/modules/mentor/prompts";
import { discoverySchema, insightsSchema } from "@/modules/mentor/schemas";
import type { DiscoveryLesson, MentorContext, MentorGoal, MentorInsights } from "@/modules/mentor/types";
import type { LearningExperience } from "@/modules/quests/learning";
import { libraryLearningProvider } from "@/modules/quests/learning";
import { LESSON_LIBRARY } from "@/modules/quests/lessons";
import { getAIProvider, isRealAIConfigured } from "@/server/ai";
import { aiOrFallback, type AISource } from "@/server/ai/run";
import { getCurrentUser } from "@/server/auth/current-user";
import { goalRepository } from "@/server/repositories/goal.repository";
import { identityRepository } from "@/server/repositories/identity.repository";
import { mentorRepository } from "@/server/repositories/mentor.repository";
import { progressionRepository } from "@/server/repositories/progression.repository";
import { reflectionRepository } from "@/server/repositories/reflection.repository";

const DAY_MS = 86_400_000;
const REFLECTION_LIMIT = 6;

type GoalWithMilestones = Awaited<ReturnType<typeof goalRepository.list>>[number];

function toMentorGoal(goal: GoalWithMilestones): MentorGoal {
  const progress = computeRoadmapProgress(goal.milestones);
  const step = nextStep(goal.milestones);
  return {
    id: goal.id,
    title: goal.title,
    lifeArea: goal.lifeArea,
    status: goal.status,
    percent: goalPercent(goal.status, progress),
    milestoneCount: goal.milestones.length,
    nextStep: step ? (step.mission?.title ?? step.milestone.title) : null,
  };
}

/** Assemble everything the mentor reasons over. Pure data, no AI. */
export async function buildMentorContext(user: Pick<User, "id" | "displayName" | "timezone">): Promise<MentorContext> {
  const today = todayInTimezone(user.timezone);
  const todayDate = parseDateOnly(today);
  const from = parseDateOnly(formatDateOnly(new Date(todayDate.getTime() - 6 * DAY_MS)));

  const [preferences, interests, currentGoals, major, totalXp, attributes, outcomes, reflections, skips, dailyReflections] =
    await Promise.all([
      identityRepository.findPreferences(user.id),
      identityRepository.listInterests(user.id),
      goalRepository.list(user.id, "current"),
      goalRepository.findMajorGoal(user.id),
      progressionRepository.getTotalXp(user.id),
      progressionRepository.getAttributeTotals(user.id),
      mentorRepository.questOutcomes(user.id, from, todayDate),
      mentorRepository.recentReflections(user.id, REFLECTION_LIMIT),
      mentorRepository.skipReasons(user.id, from, todayDate),
      reflectionRepository.listRecentDaily(user.id, 5),
    ]);

  const core = outcomes.filter((o) => o.isCore);
  const todayCore = core.filter((o) => formatDateOnly(o.date) === today);
  const areaKeys = [...new Set(core.map((o) => o.lifeArea))];
  const byArea = areaKeys.map((lifeArea) => {
    const rows = core.filter((o) => o.lifeArea === lifeArea);
    return {
      lifeArea,
      total: rows.length,
      completed: rows.filter((o) => o.status === "COMPLETED").length,
    };
  });

  const progress = getLevelProgress(totalXp);

  return {
    user: { name: user.displayName, timezone: user.timezone },
    preferences: preferences
      ? {
          dailyMinutes: preferences.dailyMinutes,
          challengeLevel: preferences.challengeLevel,
          movementOptions: preferences.movementOptions,
          learningFormats: preferences.learningFormats,
        }
      : {
          dailyMinutes: DEFAULT_PREFERENCES.dailyMinutes,
          challengeLevel: DEFAULT_PREFERENCES.challengeLevel,
          movementOptions: [],
          learningFormats: [],
        },
    interests: interests.map((i) => i.label),
    focusAreas: currentGoals.flatMap((g) => (g.status === "ACTIVE" ? [g.lifeArea] : [])),
    progression: {
      level: progress.level,
      tier: tierForLevel(progress.level),
      totalXp,
      attributes: attributes.map((a) => ({ attribute: a.attribute, total: a.total })),
    },
    majorGoal: major ? toMentorGoal(major) : null,
    goals: currentGoals.map(toMentorGoal),
    quests: {
      today: { completed: todayCore.filter((o) => o.status === "COMPLETED").length, total: todayCore.length },
      last7Days: { completed: core.filter((o) => o.status === "COMPLETED").length, total: core.length },
      byArea,
      neglectedAreas: byArea.filter((a) => a.total > 0 && a.completed === 0).map((a) => a.lifeArea),
      strongAreas: byArea
        .filter((a) => a.completed > 0)
        .sort((x, y) => y.completed - x.completed)
        .slice(0, 2)
        .map((a) => a.lifeArea),
      recentReflections: reflections.map((r) => ({
        date: formatDateOnly(r.completedAt),
        lifeArea: r.quest.lifeArea as LifeArea,
        note: r.note ?? "",
      })),
      commonSkipReasons: skips
        .sort((a, b) => b._count.skipReason - a._count.skipReason)
        .map((s) => s.skipReason)
        .filter((r): r is string => r !== null),
    },
    dailyReflections: dailyReflections.map((r) => ({
      date: formatDateOnly(r.date),
      mood: r.mood,
      learned: r.learned,
      difficult: r.difficult,
      differently: r.differently,
    })),
  };
}

export type MentorPanel = {
  insights: MentorInsights;
  discovery: LearningExperience;
  source: { insights: AISource; discovery: AISource };
  aiConfigured: boolean;
};

/** The full mentor page payload: context → insights + a discovery. */
export async function getMentorPanel(): Promise<MentorPanel> {
  const user = await getCurrentUser();
  const context = await buildMentorContext(user);

  const [insights, discovery] = await Promise.all([getInsights(context), getDiscovery(context)]);

  return {
    insights: insights.value,
    discovery: discovery.value,
    source: { insights: insights.source, discovery: discovery.source },
    aiConfigured: isRealAIConfigured(),
  };
}

export type MentorPanelResult = MentorPanel;

async function getInsights(context: MentorContext) {
  return aiOrFallback(
    {
      task: "mentor.insights",
      schema: insightsSchema,
      system: MENTOR_SYSTEM,
      prompt: insightsPrompt(),
      input: context,
    },
    () => fallbackInsights(context),
  ).then((result) => ({
    source: result.source,
    value:
      result.source === "ai"
        ? ({
            ...result.value,
            goalGuidance:
              result.value.goalGuidance && context.majorGoal
                ? { goalId: context.majorGoal.id, ...result.value.goalGuidance }
                : null,
          } as MentorInsights)
        : (result.value as MentorInsights),
  }));
}

async function getDiscovery(context: MentorContext): Promise<{ value: LearningExperience; source: AISource }> {
  // Only draws on the library for its fallback; the model authors fresh ones.
  const result = await aiOrFallback(
    {
      task: "mentor.discovery",
      schema: discoverySchema,
      system: MENTOR_SYSTEM,
      prompt: discoveryPrompt(),
      input: {
        interests: context.interests,
        recentReflections: context.quests.recentReflections.map((r) => r.note).slice(0, 3),
      },
    },
    (): DiscoveryLesson => {
      const lesson =
        libraryLearningProvider.suggest({ interests: context.interests, recentLessonIds: [], rng: Math.random }) ??
        LESSON_LIBRARY[0];
      const { title, minutes, hook, sections, keyIdea, reflectionPrompt, tags } = lesson;
      return { title, minutes, hook, sections, keyIdea, reflectionPrompt, tags };
    },
  );

  const draft = result.value;
  return {
    value: {
      id: `${result.source === "ai" ? "mentor" : "library"}-${interestSlug(draft.title) || "discovery"}`,
      provider: result.source === "ai" ? "mentor" : "library",
      ...draft,
    },
    source: result.source,
  };
}

export function mentorAvailable(): boolean {
  return getAIProvider() !== undefined;
}
