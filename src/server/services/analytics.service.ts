import "server-only";

import type { User } from "@/generated/prisma/client";
import {
  fetchDays,
  localDayAndHour,
  shiftDate,
  type AnalyticsDataset,
  type AnalyticsGoal,
  type AnalyticsRangeKey,
} from "@/modules/analytics/dataset";
import {
  allowedLinks,
  fallbackReport,
  groundReport,
  insightReportSchema,
  insightsPrompt,
  INSIGHTS_SYSTEM,
  modelInput,
  type InsightReport,
} from "@/modules/analytics/insights";
import { buildOverview, type AnalyticsOverview } from "@/modules/analytics/overview";
import { detectPatterns, hasEnoughHistory, type Pattern } from "@/modules/analytics/patterns";
import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { computeRoadmapProgress, goalPercent } from "@/modules/goals/progress";
import { aiOrFallback, type AISource } from "@/server/ai/run";
import { analyticsRepository } from "@/server/repositories/analytics.repository";
import { goalRepository } from "@/server/repositories/goal.repository";

type UserLike = Pick<User, "id" | "timezone">;

/**
 * Personal analytics (spec §37–39): trends, balance and goal momentum from
 * the user's own records, plus patterns and recommendations — explained by
 * AI when configured, otherwise shown as the rules found them.
 */

/** Everything analytics reads for a range, converted to the user's calendar days. */
export async function buildAnalyticsDataset(user: UserLike, range: AnalyticsRangeKey, now = new Date()): Promise<AnalyticsDataset> {
  const today = todayInTimezone(user.timezone, now);
  const from = shiftDate(today, -(fetchDays(range) - 1));
  // One spare day either side of UTC so a timezone offset can't clip the first day.
  const since = parseDateOnly(shiftDate(from, -1));
  const local = (instant: Date) => localDayAndHour(instant, user.timezone);

  const [quests, xp, skillXp, skills, goals, challenges, projects] = await Promise.all([
    analyticsRepository.quests(user.id, parseDateOnly(from)),
    analyticsRepository.xp(user.id, since),
    analyticsRepository.skillXp(user.id),
    analyticsRepository.skills(),
    goalRepository.list(user.id, "current"),
    analyticsRepository.challenges(user.id),
    analyticsRepository.projects(user.id),
  ]);

  const [missions, goalQuests] = goals.length
    ? await analyticsRepository.goalActivity(user.id, goals.map((goal) => goal.id))
    : [[], []];

  const analyticsGoals: AnalyticsGoal[] = goals.map((goal) => {
    const progress = computeRoadmapProgress(goal.milestones);
    return {
      id: goal.id,
      title: goal.title,
      lifeArea: goal.lifeArea,
      status: goal.status,
      priority: goal.priority,
      createdDate: local(goal.createdAt).date,
      percent: goalPercent(goal.status, progress),
      completedMissions: progress.completedMissions,
      totalMissions: progress.totalMissions - progress.skippedMissions,
      missionDates: missions.filter((mission) => mission.goalId === goal.id).map((mission) => local(mission.completedAt!).date),
      questDates: goalQuests.filter((row) => row.quest.goalId === goal.id).map((row) => local(row.completedAt).date),
    };
  });

  return {
    today,
    quests: quests.flatMap((quest) =>
      quest.dailyQuestSet
        ? [
            {
              date: formatDateOnly(quest.dailyQuestSet.date),
              lifeArea: quest.lifeArea,
              status: quest.status,
              difficulty: quest.difficulty,
              goalId: quest.goalId,
              completedHour: quest.status === "COMPLETED" && quest.completion ? local(quest.completion.completedAt).hour : null,
            },
          ]
        : [],
    ),
    xp: xp.map((row) => ({ date: local(row.createdAt).date, amount: row.amount, lifeArea: row.lifeArea, sourceType: row.sourceType })),
    skillXp: skillXp.map((row) => ({ date: local(row.createdAt).date, skillId: row.skillId, amount: row.amount, sourceType: row.sourceType })),
    skills: skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      baseXp: skill.baseXp,
      maxLevel: skill.maxLevel,
      treeSlug: skill.tree.slug,
      treeName: skill.tree.name,
      treeEmoji: skill.tree.emoji,
    })),
    goals: analyticsGoals,
    challenges: challenges.map((challenge) => {
      const ended = challenge.completedAt ?? challenge.endedAt;
      return {
        id: challenge.id,
        title: challenge.title,
        emoji: challenge.emoji,
        status: challenge.status,
        endDate: ended ? local(ended).date : null,
        daysCredited: challenge._count.days,
        targetDays: challenge.targetDays,
      };
    }),
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      status: project.status,
      startDate: project.startedAt ? local(project.startedAt).date : null,
      treeSlugs: [...new Set(project.skills.map((row) => row.skill.tree.slug))],
    })),
  };
}

export type Analytics = {
  overview: AnalyticsOverview;
  patterns: Pattern[];
  enoughHistory: boolean;
  userId: string;
};

export async function getAnalytics(user: UserLike, range: AnalyticsRangeKey): Promise<Analytics> {
  const dataset = await buildAnalyticsDataset(user, range);
  return {
    overview: buildOverview(dataset, range),
    patterns: detectPatterns(dataset),
    enoughHistory: hasEnoughHistory(dataset),
    userId: user.id,
  };
}

// AI explanations only change when the patterns do, so the last few are kept
// in memory rather than asking the model again on every visit.
const AI_CACHE_LIMIT = 20;
const aiCache = new Map<string, InsightReport>();

export type InsightReportResult = InsightReport & { source: AISource };

export async function getInsightReport({ overview, patterns, userId }: Analytics): Promise<InsightReportResult> {
  const fallback = fallbackReport(patterns, { hasActiveGoal: overview.goals.some((goal) => goal.momentum !== "paused") });
  // Nothing to explain: don't spend a model call on an empty record.
  if (patterns.length === 0) return { ...fallback, source: "fallback" };

  const input = modelInput(patterns, overview);
  const cacheKey = `${userId}:${JSON.stringify(input)}`;
  const cached = aiCache.get(cacheKey);
  if (cached) return { ...cached, source: "ai" };

  const result = await aiOrFallback(
    {
      task: "analytics.insights",
      schema: insightReportSchema,
      system: INSIGHTS_SYSTEM,
      prompt: insightsPrompt(),
      input,
      maxTokens: 1200,
    },
    // An empty draft grounds to nothing, which selects the rule-based report below.
    () => ({ headline: "", insights: [], recommendations: [] }),
  );

  const grounded = groundReport(result.value, patterns, allowedLinks(patterns, overview));
  if (!grounded) {
    if (result.source === "ai") console.warn('[ai] "analytics.insights" cited no known patterns — showing rule-based insights.');
    return { ...fallback, source: "fallback" };
  }

  // The model may skip recommendations; the rule-based ones still apply.
  const report: InsightReport = {
    ...grounded,
    recommendations: grounded.recommendations.length ? grounded.recommendations : fallback.recommendations,
  };
  aiCache.set(cacheKey, report);
  if (aiCache.size > AI_CACHE_LIMIT) aiCache.delete(aiCache.keys().next().value!);
  return { ...report, source: "ai" };
}
