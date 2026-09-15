import "server-only";

import type {
  ContentSource,
  GoalStatus,
  LifeArea,
  MilestoneStatus,
  StartingPoint,
} from "@/generated/prisma/enums";
import { formatDateOnly, todayInTimezone } from "@/modules/goals/dates";
import {
  computeRoadmapProgress,
  goalPercent,
  nextStep,
  type RoadmapProgress,
} from "@/modules/goals/progress";
import { getCurrentUser } from "@/server/auth/current-user";
import { goalRepository, type GoalListView } from "@/server/repositories/goal.repository";

export type GoalCard = {
  id: string;
  title: string;
  lifeArea: LifeArea;
  status: GoalStatus;
  archived: boolean;
  isMajor: boolean;
  target: string | null;
  deadline: string | null;
  percent: number;
  progress: RoadmapProgress;
  next: ReturnType<typeof nextStep>;
  milestones: { id: string; title: string; status: MilestoneStatus }[];
};

export type GoalsOverview = {
  view: GoalListView;
  today: string;
  counts: { current: number; completed: number; archived: number };
  activeCount: number;
  goals: GoalCard[];
};

type GoalWithSummary = Awaited<ReturnType<typeof goalRepository.list>>[number];

function toCard(goal: GoalWithSummary, majorGoalId: string | null): GoalCard {
  const progress = computeRoadmapProgress(goal.milestones);
  return {
    id: goal.id,
    title: goal.title,
    lifeArea: goal.lifeArea,
    status: goal.status,
    archived: goal.archivedAt !== null,
    isMajor: goal.id === majorGoalId,
    target: goal.target,
    deadline: goal.deadline ? formatDateOnly(goal.deadline) : null,
    percent: goalPercent(goal.status, progress),
    progress,
    next: goal.status === "COMPLETED" ? null : nextStep(goal.milestones),
    milestones: goal.milestones.map(({ id, title, status }) => ({ id, title, status })),
  };
}

export async function getGoalsOverview(view: GoalListView): Promise<GoalsOverview> {
  const user = await getCurrentUser();
  const [goals, counts, major, activeCount] = await Promise.all([
    goalRepository.list(user.id, view),
    goalRepository.countByView(user.id),
    goalRepository.findMajorGoal(user.id),
    goalRepository.countActive(user.id),
  ]);

  const cards = goals.map((goal) => toCard(goal, major?.id ?? null));
  // Major first, then active before paused; repository order otherwise.
  cards.sort((a, b) => Number(b.isMajor) - Number(a.isMajor) || Number(a.status === "PAUSED") - Number(b.status === "PAUSED"));

  return { view, today: todayInTimezone(user.timezone), counts, activeCount, goals: cards };
}

export async function getMajorGoalCard(userId: string): Promise<GoalCard | null> {
  const major = await goalRepository.findMajorGoal(userId);
  return major ? toCard(major, major.id) : null;
}

export type RoadmapMission = {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  source: ContentSource;
};

export type RoadmapMilestone = {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  source: ContentSource;
  missions: RoadmapMission[];
};

export type GoalDetail = GoalCard & {
  description: string | null;
  motivation: string | null;
  startingPoint: StartingPoint;
  createdAt: Date;
  completedAt: Date | null;
  pausedAt: Date | null;
  today: string;
  roadmap: RoadmapMilestone[];
  lastRevision: { source: ContentSource; generator: string; summary: string | null; createdAt: Date } | null;
};

export async function getGoalDetail(goalId: string): Promise<GoalDetail | null> {
  const user = await getCurrentUser();
  const [goal, major] = await Promise.all([
    goalRepository.findDetail(user.id, goalId),
    goalRepository.findMajorGoal(user.id),
  ]);
  if (!goal) return null;

  return {
    ...toCard(goal, major?.id ?? null),
    description: goal.description,
    motivation: goal.motivation,
    startingPoint: goal.startingPoint,
    createdAt: goal.createdAt,
    completedAt: goal.completedAt,
    pausedAt: goal.pausedAt,
    today: todayInTimezone(user.timezone),
    roadmap: goal.milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      status: milestone.status,
      source: milestone.source,
      missions: milestone.missions.map((mission) => ({
        id: mission.id,
        title: mission.title,
        description: mission.description,
        status: mission.status,
        source: mission.source,
      })),
    })),
    lastRevision: goal.roadmapRevisions[0] ?? null,
  };
}
