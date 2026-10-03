import "server-only";

import type { User } from "@/generated/prisma/client";
import { ACHIEVEMENTS } from "@/modules/achievements/catalogue";
import { DECISION_META } from "@/modules/experiments/logic";
import { PROJECT_CATEGORIES } from "@/modules/projects/categories";
import {
  characterLevelEvents,
  filterTimeline,
  groupTimeline,
  skillMilestoneEvents,
  TIMELINE_KINDS,
  type TimelineEvent,
  type TimelineKind,
  type TimelineYear,
} from "@/modules/timeline/timeline";
import { db } from "@/server/db";

/**
 * The Life Timeline (spec §43), assembled on read from what actually
 * happened. Private journal entries are deliberately never part of it.
 */

type UserLike = Pick<User, "id" | "timezone">;

const achievementEmoji = new Map(ACHIEVEMENTS.map((achievement) => [achievement.slug, achievement.emoji]));

export async function collectEvents(userId: string): Promise<TimelineEvent[]> {
  const [goals, projects, achievements, challenges, skillRows, skills, abilityPasses, experiences, experiments, xpRows] = await Promise.all([
    db.goal.findMany({ where: { userId }, select: { id: true, title: true, createdAt: true, completedAt: true, status: true } }),
    db.project.findMany({
      where: { userId },
      select: { id: true, title: true, category: true, startedAt: true, completedAt: true, status: true, _count: { select: { evidence: true } } },
    }),
    db.userAchievement.findMany({ where: { userId }, select: { unlockedAt: true, achievement: { select: { slug: true, name: true, description: true } } } }),
    db.challenge.findMany({ where: { userId, status: "COMPLETED" }, select: { id: true, title: true, emoji: true, durationDays: true, completedAt: true } }),
    db.skillXpTransaction.findMany({ where: { userId }, select: { skillId: true, amount: true, createdAt: true } }),
    db.skill.findMany({ select: { id: true, name: true, baseXp: true, maxLevel: true, tree: { select: { slug: true, emoji: true } } } }),
    db.assessmentAttempt.findMany({
      where: { userId, outcome: "PASSED", kind: { in: ["PRACTICAL", "PROJECT"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, assessmentKey: true, title: true, createdAt: true, skill: { select: { name: true, tree: { select: { emoji: true } } } } },
    }),
    db.questCompletion.findMany({
      where: { userId, quest: { lifeArea: "EXPERIENCES" } },
      select: { id: true, completedAt: true, note: true, quest: { select: { id: true, title: true } } },
    }),
    db.experiment.findMany({
      where: { userId },
      select: { id: true, title: true, emoji: true, createdAt: true, reviewedAt: true, status: true, decision: true, _count: { select: { days: true } } },
    }),
    db.xpTransaction.findMany({ where: { userId }, select: { amount: true, createdAt: true } }),
  ]);

  const events: TimelineEvent[] = [];

  for (const goal of goals) {
    events.push({ id: `goal-set-${goal.id}`, kind: "goal", date: goal.createdAt, title: `Set a goal: ${goal.title}`, detail: "A new direction", emoji: "🧭", href: `/goals/${goal.id}`, major: false });
    if (goal.status === "COMPLETED" && goal.completedAt) {
      events.push({ id: `goal-done-${goal.id}`, kind: "goal", date: goal.completedAt, title: `Completed ${goal.title}`, detail: "Goal completed", emoji: "🏔️", href: `/goals/${goal.id}`, major: true });
    }
  }

  for (const project of projects) {
    const category = PROJECT_CATEGORIES[project.category];
    if (project.startedAt) {
      events.push({ id: `project-start-${project.id}`, kind: "project", date: project.startedAt, title: `Started building ${project.title}`, detail: `${category.label} project`, emoji: category.emoji, href: `/projects/${project.id}`, major: false });
    }
    if (project.status === "COMPLETED" && project.completedAt) {
      events.push({
        id: `project-done-${project.id}`,
        kind: "project",
        date: project.completedAt,
        title: `Built ${project.title}`,
        detail: `${category.label} project completed · ${project._count.evidence} piece${project._count.evidence === 1 ? "" : "s"} of evidence`,
        emoji: category.emoji,
        href: `/projects/${project.id}`,
        major: true,
      });
    }
  }

  for (const entry of achievements) {
    events.push({
      id: `achievement-${entry.achievement.slug}`,
      kind: "achievement",
      date: entry.unlockedAt,
      title: entry.achievement.name,
      detail: entry.achievement.description,
      emoji: achievementEmoji.get(entry.achievement.slug) ?? "🏆",
      href: "/journey#achievements",
      major: false,
    });
  }

  for (const challenge of challenges) {
    if (!challenge.completedAt) continue;
    events.push({
      id: `challenge-${challenge.id}`,
      kind: "challenge",
      date: challenge.completedAt,
      title: `Completed ${challenge.title}`,
      detail: `${challenge.durationDays}-day challenge`,
      emoji: challenge.emoji,
      href: "/journey/challenges",
      major: challenge.durationDays >= 14,
    });
  }

  events.push(
    ...skillMilestoneEvents(
      skillRows,
      skills.map((skill) => ({ id: skill.id, name: skill.name, baseXp: skill.baseXp, maxLevel: skill.maxLevel, treeSlug: skill.tree.slug, treeEmoji: skill.tree.emoji })),
    ),
  );

  // First demonstration per assessment: proof is a milestone, retakes aren't.
  const seenKeys = new Set<string>();
  for (const attempt of abilityPasses) {
    if (seenKeys.has(attempt.assessmentKey)) continue;
    seenKeys.add(attempt.assessmentKey);
    events.push({
      id: `proof-${attempt.id}`,
      kind: "skill",
      date: attempt.createdAt,
      title: `Demonstrated ${attempt.skill.name}`,
      detail: `Passed “${attempt.title}”`,
      emoji: attempt.skill.tree.emoji,
      href: `/assessments/attempts/${attempt.id}`,
      major: true,
    });
  }

  for (const experience of experiences) {
    events.push({
      id: `experience-${experience.id}`,
      kind: "experience",
      date: experience.completedAt,
      title: experience.quest.title,
      detail: experience.note ?? "A new experience",
      emoji: "🌎",
      href: `/quests/${experience.quest.id}`,
      major: false,
    });
  }

  for (const experiment of experiments) {
    events.push({ id: `experiment-start-${experiment.id}`, kind: "experiment", date: experiment.createdAt, title: `Started an experiment: ${experiment.title}`, detail: "Trying something new", emoji: experiment.emoji, href: `/discover/${experiment.id}`, major: false });
    if (experiment.status === "REVIEWED" && experiment.reviewedAt) {
      const days = experiment._count.days;
      events.push({
        id: `experiment-review-${experiment.id}`,
        kind: "experiment",
        date: experiment.reviewedAt,
        title: `Finished the experiment: ${experiment.title}`,
        detail: `${days} day${days === 1 ? "" : "s"} of practice${experiment.decision ? ` · ${DECISION_META[experiment.decision].label}` : ""}`,
        emoji: experiment.emoji,
        href: `/discover/${experiment.id}`,
        major: experiment.decision === "MAKE_IT_A_GOAL",
      });
    }
  }

  events.push(...characterLevelEvents(xpRows));
  return events;
}

export type LifeTimeline = {
  years: TimelineYear[];
  total: number;
  counts: Record<TimelineKind, number>;
  active: TimelineKind[];
};

export async function getLifeTimeline(user: UserLike, kinds: readonly string[] = []): Promise<LifeTimeline> {
  const events = await collectEvents(user.id);
  const active = kinds.filter((kind): kind is TimelineKind => (TIMELINE_KINDS as readonly string[]).includes(kind));
  const counts = Object.fromEntries(TIMELINE_KINDS.map((kind) => [kind, events.filter((event) => event.kind === kind).length])) as Record<TimelineKind, number>;
  return {
    years: groupTimeline(filterTimeline(events, new Set(active)), user.timezone),
    total: events.length,
    counts,
    active,
  };
}
