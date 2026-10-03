import "server-only";

import type { LifeArea } from "@/generated/prisma/enums";
import type { User } from "@/generated/prisma/client";
import { localDayAndHour } from "@/modules/analytics/dataset";
import { formatDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { computeRoadmapProgress, goalPercent } from "@/modules/goals/progress";
import { toAppearance, type AvatarAppearance } from "@/modules/identity/avatar";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { rangeWindows, type JourneyRangeKey, type RangeWindows } from "@/modules/journey/calendar";
import { characterJourney, milestonePath, type CharacterJourney, type MilestoneNode } from "@/modules/journey/character";
import {
  activityGrid,
  firstActivity,
  hasHistory,
  heatmap,
  lifeAreaProgress,
  monthWeeks,
  questsByDay,
  xpProgress,
  type ActivityGrid,
  type Heatmap,
  type JourneyDataset,
  type LifeAreaProgress,
  type WeekRing,
  type XpProgress,
} from "@/modules/journey/progress";
import {
  monthlyReview,
  resolveYear,
  weeklyReview,
  yearlyJourney,
  yearsWithActivity,
  type JourneyEvent,
  type MonthlyReview,
  type WeeklyReview,
  type YearlyJourney,
} from "@/modules/journey/reviews";
import type { SkillPathStep } from "@/modules/skills/state";
import { analyticsRepository } from "@/server/repositories/analytics.repository";
import { goalRepository } from "@/server/repositories/goal.repository";
import { identityRepository } from "@/server/repositories/identity.repository";
import { journeyRepository } from "@/server/repositories/journey.repository";
import { getAchievementsView, type AchievementView } from "@/server/services/achievement.service";
import { getSkillsOverview } from "@/server/services/skill.service";
import { collectEvents } from "@/server/services/timeline.service";

type UserLike = Pick<User, "id" | "timezone" | "displayName">;

/**
 * The Journey screen (the user's progression map): everything it shows,
 * read from real records in one pass. Chart logic lives in modules/journey;
 * this only gathers the records and hands them over.
 */

export type GoalJourney = {
  id: string;
  title: string;
  lifeArea: LifeArea;
  emoji: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  percent: number;
  completedMissions: number;
  totalMissions: number;
  isMajor: boolean;
  milestones: MilestoneNode[];
};

export type SkillJourney = {
  slug: string;
  name: string;
  emoji: string;
  xp: number;
  frontier: { name: string; level: number; maxLevel: number; percent: number } | null;
  path: SkillPathStep[];
};

export type JourneyAchievement = AchievementView & { unlockedOn: string | null };

export type JourneyView = {
  today: string;
  who: { name: string; appearance: AvatarAppearance };
  hasHistory: boolean;
  questsCompleted: number;
  character: CharacterJourney;
  month: { label: string; weeks: WeekRing[] };
  range: RangeWindows;
  xp: XpProgress;
  areas: LifeAreaProgress;
  activity: ActivityGrid;
  heatmap: Heatmap;
  goals: GoalJourney[];
  skills: SkillJourney[];
  week: WeeklyReview;
  monthReview: MonthlyReview;
  year: YearlyJourney;
  achievements: JourneyAchievement[];
};

export async function getJourney(user: UserLike, options: { range: JourneyRangeKey; year?: string }): Promise<JourneyView> {
  const today = todayInTimezone(user.timezone);
  const localDate = (instant: Date) => localDayAndHour(instant, user.timezone).date;

  const [character, quests, ledger, skillXp, skills, goals, achievements, skillsOverview, timeline] = await Promise.all([
    identityRepository.ensureCharacter(user.id),
    journeyRepository.quests(user.id),
    journeyRepository.xp(user.id),
    analyticsRepository.skillXp(user.id),
    analyticsRepository.skills(),
    goalRepository.list(user.id, "current"),
    getAchievementsView(user.id),
    getSkillsOverview(user.id),
    collectEvents(user.id),
  ]);

  const dataset: JourneyDataset = {
    today,
    quests: quests.flatMap((quest) =>
      quest.dailyQuestSet
        ? [
            {
              id: quest.id,
              title: quest.title,
              date: formatDateOnly(quest.dailyQuestSet.date),
              lifeArea: quest.lifeArea,
              status: quest.status,
              xpReward: quest.xpReward,
              isCore: quest.isCore,
            },
          ]
        : [],
    ),
    xp: ledger.map((row) => ({ date: localDate(row.createdAt), amount: row.amount, lifeArea: row.lifeArea, sourceType: row.sourceType })),
    skillXp: skillXp.map((row) => ({ date: localDate(row.createdAt), skillId: row.skillId, amount: row.amount, sourceType: row.sourceType })),
    skills: skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      baseXp: skill.baseXp,
      maxLevel: skill.maxLevel,
      treeSlug: skill.tree.slug,
      treeName: skill.tree.name,
      treeEmoji: skill.tree.emoji,
    })),
  };

  const range = rangeWindows(options.range, today, firstActivity(dataset));
  const byDay = questsByDay(dataset);
  const events: JourneyEvent[] = timeline.map((event) => ({
    id: event.id,
    date: localDate(event.date),
    kind: event.kind,
    title: event.title,
    emoji: event.emoji,
    major: event.major,
    href: event.href,
  }));

  const journeyAchievements: JourneyAchievement[] = achievements.map((achievement) => ({
    ...achievement,
    unlockedOn: achievement.unlockedAt ? localDate(achievement.unlockedAt) : null,
  }));

  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");
  const majorId = activeGoals.length ? activeGoals.reduce((best, goal) => (goal.priority < best.priority ? goal : best)).id : null;

  return {
    today,
    who: { name: user.displayName, appearance: toAppearance(character) },
    hasHistory: hasHistory(dataset),
    questsCompleted: dataset.quests.filter((quest) => quest.status === "COMPLETED").length,
    character: characterJourney(dataset.xp),
    month: monthWeeks(dataset),
    range,
    xp: xpProgress(dataset, range),
    areas: lifeAreaProgress(dataset, range),
    activity: activityGrid(dataset, 12, byDay),
    heatmap: heatmap(dataset, 53, byDay),
    goals: goals.map((goal): GoalJourney => {
      const progress = computeRoadmapProgress(goal.milestones);
      return {
        id: goal.id,
        title: goal.title,
        lifeArea: goal.lifeArea,
        emoji: LIFE_AREAS[goal.lifeArea].emoji,
        status: goal.status,
        percent: goalPercent(goal.status, progress),
        completedMissions: progress.completedMissions,
        totalMissions: progress.totalMissions - progress.skippedMissions,
        isMajor: goal.id === majorId,
        milestones: milestonePath(goal.milestones),
      };
    }),
    skills: skillsOverview.trees
      .filter((tree) => tree.summary.xp > 0)
      .sort((a, b) => b.summary.xp - a.summary.xp)
      .map((tree) => ({
        slug: tree.slug,
        name: tree.name,
        emoji: tree.emoji,
        xp: tree.summary.xp,
        frontier: tree.frontier ? { name: tree.frontier.name, level: tree.frontier.level, maxLevel: tree.frontier.maxLevel, percent: tree.frontier.percent } : null,
        path: tree.path,
      })),
    week: weeklyReview(
      dataset,
      journeyAchievements.flatMap((achievement) =>
        achievement.unlockedOn
          ? [{ slug: achievement.slug, name: achievement.name, emoji: achievement.emoji, rarity: achievement.rarity, date: achievement.unlockedOn }]
          : [],
      ),
    ),
    monthReview: monthlyReview(dataset),
    year: yearlyJourney(dataset, events, resolveYear(options.year, yearsWithActivity(dataset, events))),
    achievements: journeyAchievements,
  };
}
