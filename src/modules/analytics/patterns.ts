import type { LifeArea } from "@/generated/prisma/enums";
import { CORE_DAILY_LIFE_AREAS, LIFE_AREAS } from "@/modules/identity/life-areas";

import {
  displayDay,
  inWindow,
  PATTERN_DAYS,
  questCounts,
  shiftDate,
  windowEnding,
  type AnalyticsDataset,
} from "./dataset";
import { directionOf, goalMomentum, majorGoalId, recentAndPrior, skillGains } from "./overview";

/**
 * Patterns (spec §38): things worth noticing in the user's own record, found
 * by transparent rules. Every pattern carries its evidence — the counts it
 * rests on — so nothing is asserted that the data doesn't show. The AI layer
 * may reword and connect these, but never add to them.
 *
 * No pattern claims a cause, a health effect or a score. "Increased after"
 * means exactly that: the numbers were higher afterwards.
 */

export type PatternTone = "strength" | "shift" | "watch";

export type Recommendation = {
  title: string;
  detail: string;
  href: string | null;
  actionLabel: string | null;
};

export type Pattern = {
  /** Stable id, e.g. "area-down:PHYSICAL". The AI must cite these. */
  key: string;
  tone: PatternTone;
  title: string;
  /** The numbers behind it, in plain words. Always backend-written. */
  evidence: string;
  /** Higher = more worth saying first. */
  weight: number;
  recommendation: Recommendation | null;
};

const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;
const lower = (area: LifeArea) => LIFE_AREAS[area].label.toLowerCase();

const AREA_DOWN_TITLES: Partial<Record<LifeArea, string>> = {
  PHYSICAL: "Your physical activity has decreased recently.",
  MENTAL: "Your mental practices have slipped recently.",
  LEARNING: "Your learning has slowed down recently.",
  SOCIAL: "You've had less social activity recently.",
  PERSONAL_GOAL: "Daily work on your personal goals has slowed recently.",
};

const AREA_RESTART: Partial<Record<LifeArea, Recommendation>> = {
  PHYSICAL: {
    title: "Bring movement back in small doses",
    detail: "A ten-minute walk counts. Keep movement short this week so restarting doesn't feel like a project.",
    href: "/character/edit#preferences",
    actionLabel: "Adjust movement options",
  },
  MENTAL: {
    title: "Make space for a two-minute pause",
    detail: "Mental quests don't need to be long. A few slow breaths before the day's hardest task is a real start.",
    href: "/",
    actionLabel: "Today's journey",
  },
  LEARNING: {
    title: "Pick one small thing to learn",
    detail: "A single short lesson restarts the habit. Choose a topic you're curious about rather than one you ought to learn.",
    href: "/skills",
    actionLabel: "Pick a skill to practise",
  },
  SOCIAL: {
    title: "Reach out to one person",
    detail: "A message to someone you haven't spoken to in a while is enough to reopen this part of your life.",
    href: "/",
    actionLabel: "Today's journey",
  },
  PERSONAL_GOAL: {
    title: "Shrink your next goal step",
    detail: "When goal quests stall, the next mission is usually too big. Split it into something you could finish today.",
    href: "/goals",
    actionLabel: "Review goals",
  },
};

// ─── Time of day ─────────────────────────────────────────────────────────────

const DAY_PARTS = [
  { key: "morning", label: "morning", span: "before noon", from: 5, to: 12 },
  { key: "afternoon", label: "afternoon", span: "between noon and 5pm", from: 12, to: 17 },
  { key: "evening", label: "evening", span: "between 5pm and 10pm", from: 17, to: 22 },
] as const;

function dayPartOf(hour: number) {
  return DAY_PARTS.find((part) => hour >= part.from && hour < part.to) ?? null;
}

function dominantDayPart(hours: readonly number[], share: number) {
  const counts = new Map<string, number>();
  for (const hour of hours) {
    const part = dayPartOf(hour);
    if (part) counts.set(part.key, (counts.get(part.key) ?? 0) + 1);
  }
  const top = DAY_PARTS.map((part) => ({ part, count: counts.get(part.key) ?? 0 })).sort((a, b) => b.count - a.count)[0];
  return top.count >= Math.ceil(hours.length * share) ? top : null;
}

function timeOfDayPatterns(dataset: AnalyticsDataset): Pattern[] {
  const window = windowEnding(dataset.today, PATTERN_DAYS);
  const completed = dataset.quests.filter((quest) => quest.status === "COMPLETED" && quest.completedHour !== null && inWindow(quest.date, window));

  const hardHours = completed.filter((quest) => quest.difficulty === "HARD").map((quest) => quest.completedHour!);
  if (hardHours.length >= 5) {
    const top = dominantDayPart(hardHours, 0.6);
    if (top) {
      return [
        {
          key: `hard-time:${top.part.key}`,
          tone: "strength",
          title: `You've been consistently completing difficult tasks in the ${top.part.label}.`,
          evidence: `${top.count} of ${hardHours.length} hard quests in the last 12 weeks were finished ${top.part.span}.`,
          weight: 60,
          recommendation: {
            title: `Save demanding quests for the ${top.part.label}`,
            detail: `When a quest looks hard, start it in the ${top.part.label} — that's when you've been getting them done.`,
            href: null,
            actionLabel: null,
          },
        },
      ];
    }
  }

  const allHours = completed.map((quest) => quest.completedHour!);
  if (allHours.length >= 12) {
    const top = dominantDayPart(allHours, 0.6);
    if (top) {
      return [
        {
          key: `quest-time:${top.part.key}`,
          tone: "shift",
          title: `Most of your quests get done in the ${top.part.label}.`,
          evidence: `${top.count} of ${allHours.length} completed quests in the last 12 weeks were finished ${top.part.span}.`,
          weight: 25,
          recommendation: null,
        },
      ];
    }
  }
  return [];
}

// ─── Activity shifts ─────────────────────────────────────────────────────────

function activityPatterns(dataset: AnalyticsDataset): Pattern[] {
  const { recent, prior } = recentAndPrior(dataset);
  const patterns: Pattern[] = [];

  const overallRecent = questCounts(dataset.quests, { window: recent }).completed;
  const overallPrior = questCounts(dataset.quests, { window: prior }).completed;
  const overallRatio = overallPrior > 0 ? overallRecent / overallPrior : 1;

  if (overallPrior >= 6 && overallRecent <= overallPrior * 0.6) {
    patterns.push({
      key: "overall-down",
      tone: "watch",
      title: "You've completed fewer quests over the last three weeks.",
      evidence: `${plural(overallRecent, "quest")} in the last 3 weeks, down from ${overallPrior} the 3 weeks before.`,
      weight: 72,
      recommendation: {
        title: "Let the next week be lighter",
        detail: "On days that feel full, check in with low energy — AROHA shrinks the quests instead of piling them up.",
        href: "/",
        actionLabel: "Today's journey",
      },
    });
  } else if (overallPrior >= 3 && overallRecent - overallPrior >= 5 && overallRecent >= overallPrior * 1.5) {
    // Needs a real "before": going from nothing to something is starting out, not a trend.
    patterns.push({
      key: "overall-up",
      tone: "strength",
      title: "You've been showing up more lately.",
      evidence: `${plural(overallRecent, "quest")} in the last 3 weeks, up from ${overallPrior} the 3 weeks before.`,
      weight: 42,
      recommendation: null,
    });
  }

  for (const lifeArea of CORE_DAILY_LIFE_AREAS) {
    const areaRecent = questCounts(dataset.quests, { window: recent, lifeArea }).completed;
    const areaPrior = questCounts(dataset.quests, { window: prior, lifeArea }).completed;
    const direction = directionOf(areaRecent, areaPrior);
    const evidenceTail = `in the last 3 weeks, ${direction === "down" ? "down" : "up"} from ${areaPrior} the 3 weeks before.`;

    // An area only stands out when it moved differently from everything else.
    if (direction === "down" && areaRecent / areaPrior < overallRatio - 0.2) {
      patterns.push({
        key: `area-down:${lifeArea}`,
        tone: "watch",
        title: AREA_DOWN_TITLES[lifeArea] ?? `${LIFE_AREAS[lifeArea].label} has gone quieter recently.`,
        evidence: `${plural(areaRecent, `${lower(lifeArea)} quest`)} completed ${evidenceTail}`,
        weight: 70,
        recommendation: AREA_RESTART[lifeArea] ?? null,
      });
    } else if (direction === "up" && areaPrior >= 2 && areaRecent / areaPrior > overallRatio + 0.2) {
      patterns.push({
        key: `area-up:${lifeArea}`,
        tone: "strength",
        title: `${LIFE_AREAS[lifeArea].label} has picked up.`,
        evidence: `${plural(areaRecent, `${lower(lifeArea)} quest`)} completed ${evidenceTail}`,
        weight: 40,
        recommendation: null,
      });
    }
  }

  // Areas whose quests are offered but rarely done — a fit problem, not a willpower one.
  const month = windowEnding(dataset.today, 28);
  const overallMonth = questCounts(dataset.quests, { window: month });
  if (overallMonth.settled > 0 && overallMonth.completed / overallMonth.settled >= 0.5) {
    for (const lifeArea of CORE_DAILY_LIFE_AREAS) {
      if (patterns.some((pattern) => pattern.key === `area-down:${lifeArea}`)) continue;
      const area = questCounts(dataset.quests, { window: month, lifeArea });
      if (area.settled >= 6 && area.completed / area.settled <= 0.25) {
        patterns.push({
          key: `area-rare:${lifeArea}`,
          tone: "watch",
          title: `${LIFE_AREAS[lifeArea].label} quests rarely get done.`,
          evidence: `${area.completed} of ${area.settled} completed in the last 4 weeks, while you finished ${Math.round((overallMonth.completed / overallMonth.settled) * 100)}% of quests overall.`,
          weight: 50,
          recommendation: {
            title: `Reshape your ${lower(lifeArea)} quests`,
            detail: "If they don't fit your life, change your preferences so they do. A quest you'll actually do beats a better one you won't.",
            href: "/character/edit#preferences",
            actionLabel: "Adjust preferences",
          },
        });
      }
    }
  }

  const days = new Set(dataset.quests.filter((quest) => quest.status === "COMPLETED" && inWindow(quest.date, month)).map((quest) => quest.date));
  if (days.size >= 18) {
    patterns.push({
      key: "showing-up",
      tone: "strength",
      title: `You've shown up on ${days.size} of the last 28 days.`,
      evidence: `At least one quest completed on ${days.size} different days in the last 4 weeks.`,
      weight: 35,
      recommendation: null,
    });
  }

  return patterns;
}

// ─── Difficulty ──────────────────────────────────────────────────────────────

function difficultyPatterns(dataset: AnalyticsDataset): Pattern[] {
  const window = windowEnding(dataset.today, PATTERN_DAYS);
  const hard = questCounts(dataset.quests, { window, difficulty: ["HARD"] });
  const easier = questCounts(dataset.quests, { window, difficulty: ["EASY", "MEDIUM"] });
  if (hard.settled < 5 || easier.settled < 8) return [];
  if (hard.completed / hard.settled > 0.35 || easier.completed / easier.settled < 0.65) return [];
  return [
    {
      key: "hard-left-behind",
      tone: "watch",
      title: "Hard quests are getting left behind.",
      evidence: `You finished ${hard.completed} of ${hard.settled} hard quests in the last 12 weeks, compared with ${easier.completed} of ${easier.settled} easier ones.`,
      weight: 55,
      recommendation: {
        title: "Lower the challenge level a notch",
        detail: "Quests you finish build more than quests you skip. You can raise it again once finishing feels routine.",
        href: "/character/edit#preferences",
        actionLabel: "Adjust challenge level",
      },
    },
  ];
}

// ─── Goals ───────────────────────────────────────────────────────────────────

function goalPatterns(dataset: AnalyticsDataset): Pattern[] {
  const patterns: Pattern[] = [];
  const major = majorGoalId(dataset.goals);
  const active = dataset.goals.filter((goal) => goal.status === "ACTIVE").map((goal) => goalMomentum(goal, dataset.today, major));
  const settledIn = dataset.goals.some((goal) => goal.status === "ACTIVE" && goal.createdDate <= shiftDate(dataset.today, -14));
  const moving = active.filter((goal) => goal.momentum === "moving");

  if (active.length >= 3 && settledIn && moving.length <= Math.floor(active.length / 2)) {
    patterns.push({
      key: "goals-spread",
      tone: "watch",
      title:
        moving.length === 0
          ? `You have ${active.length} active goals, but none is moving consistently.`
          : `You have ${active.length} active goals but are consistently progressing on only ${moving.length === 1 ? "one" : moving.length === 2 ? "two" : moving.length}.`,
      evidence:
        moving.length === 0
          ? "None of them saw progress in two or more of the last 4 weeks."
          : `Steady progress in the last 4 weeks: ${moving.map((goal) => `“${goal.title}”`).join(", ")}. The others had little or none.`,
      weight: 80,
      recommendation: {
        title: "Pause the goals you aren't moving",
        detail: "Pausing isn't quitting. With fewer active goals, your daily goal quest points at the one that matters most.",
        href: "/goals",
        actionLabel: "Review goals",
      },
    });
  }

  const majorGoal = active.find((goal) => goal.isMajor);
  const majorSource = dataset.goals.find((goal) => goal.id === major);
  if (majorGoal && majorSource && majorSource.createdDate <= shiftDate(dataset.today, -21)) {
    const quietSince = majorGoal.lastActivity ?? null;
    if (!quietSince || quietSince <= shiftDate(dataset.today, -21)) {
      patterns.push({
        key: `goal-stalled:${majorGoal.id}`,
        tone: "watch",
        title: `“${majorGoal.title}” hasn't moved in a while.`,
        evidence: quietSince
          ? `The last mission or goal quest was completed on ${displayDay(quietSince)}.`
          : `No missions or goal quests completed since you set it on ${displayDay(majorSource.createdDate)}.`,
        weight: 75,
        recommendation: {
          title: `Make the next step on “${majorGoal.title}” smaller`,
          detail: "Break its next mission into something you could finish in twenty minutes, then do just that.",
          href: `/goals/${majorGoal.id}`,
          actionLabel: "Open goal",
        },
      });
    }
  }

  const steadiest = moving.filter((goal) => goal.activeWeeks >= 3).sort((a, b) => b.activeWeeks - a.activeWeeks || b.percent - a.percent)[0];
  if (steadiest) {
    patterns.push({
      key: `goal-steady:${steadiest.id}`,
      tone: "strength",
      title: `You're making steady progress on “${steadiest.title}”.`,
      evidence: `Progress in ${steadiest.activeWeeks} of the last 4 weeks · ${steadiest.percent}% of the roadmap done.`,
      weight: 45,
      recommendation: null,
    });
  }
  return patterns;
}

// ─── Projects and skills ─────────────────────────────────────────────────────

const PROJECT_LOOK_DAYS = 42;

/**
 * Skill XP from practice (quests, lessons, assessments) in a tree, per week,
 * before and after a project started. The project's own completion payout
 * is excluded so the comparison isn't just the reward for finishing.
 */
function projectPatterns(dataset: AnalyticsDataset): Pattern[] {
  const treeOf = new Map(dataset.skills.map((skill) => [skill.id, skill]));
  const practice = dataset.skillXp.filter((row) => row.sourceType !== "PROJECT_COMPLETION");
  const candidates: Pattern[] = [];

  const started = dataset.projects.filter((project) => project.startDate).sort((a, b) => a.startDate!.localeCompare(b.startDate!));
  const seenTrees = new Set<string>();
  const projectCount = started.length;

  for (const project of started) {
    const start = project.startDate!;
    const afterEnd = [shiftDate(start, PROJECT_LOOK_DAYS - 1), dataset.today].sort()[0];
    const afterDays = Math.round((Date.parse(afterEnd) - Date.parse(start)) / 86_400_000) + 1;
    if (afterDays < 14) continue;
    const before = { from: shiftDate(start, -PROJECT_LOOK_DAYS), to: shiftDate(start, -1) };
    const after = { from: start, to: afterEnd };

    // Only compare when there was a "before" to speak of.
    if (!practice.some((row) => inWindow(row.date, before))) continue;

    for (const slug of project.treeSlugs) {
      if (seenTrees.has(slug)) continue;
      seenTrees.add(slug);
      const inTree = practice.filter((row) => treeOf.get(row.skillId)?.treeSlug === slug);
      const beforeXp = inTree.filter((row) => inWindow(row.date, before)).reduce((total, row) => total + row.amount, 0);
      const afterXp = inTree.filter((row) => inWindow(row.date, after)).reduce((total, row) => total + row.amount, 0);
      const beforeWeekly = Math.round((beforeXp / PROJECT_LOOK_DAYS) * 7);
      const afterWeekly = Math.round((afterXp / afterDays) * 7);
      if (afterXp < 30 || afterWeekly < Math.max(beforeWeekly * 1.5, beforeWeekly + 10)) continue;

      const tree = [...treeOf.values()].find((skill) => skill.treeSlug === slug)!;
      candidates.push({
        key: `project-lift:${slug}`,
        tone: "strength",
        title:
          projectCount > 1
            ? `Your ${tree.treeName.toLowerCase()} progress increased after you started building projects.`
            : `Your ${tree.treeName.toLowerCase()} progress increased after you started building “${project.title}”.`,
        evidence: `About ${afterWeekly} ${tree.treeName} skill XP a week from practice since ${displayDay(start)}, up from about ${beforeWeekly} a week in the 6 weeks before.`,
        weight: 65 + Math.min(afterWeekly - beforeWeekly, 30) / 10,
        recommendation: {
          title: "Keep a project on the go",
          detail: `Building gave your ${tree.treeName.toLowerCase()} practice a lift. When this one is done, line up the next.`,
          href: "/projects",
          actionLabel: "Your projects",
        },
      });
    }
  }
  return candidates.sort((a, b) => b.weight - a.weight).slice(0, 1);
}

function skillPatterns(dataset: AnalyticsDataset): Pattern[] {
  const leap = skillGains(dataset, windowEnding(dataset.today, PATTERN_DAYS)).find((gain) => gain.levelTo - gain.levelFrom >= 2);
  if (!leap) return [];
  return [
    {
      key: `skill-leap:${leap.skillId}`,
      tone: "strength",
      title: `${leap.name} went from level ${leap.levelFrom} to level ${leap.levelTo}.`,
      evidence: `${leap.xp} skill XP in ${leap.name} over the last 12 weeks.`,
      weight: 40,
      recommendation: null,
    },
  ];
}

// ─── Challenges ──────────────────────────────────────────────────────────────

function challengePatterns(dataset: AnalyticsDataset): Pattern[] {
  const window = windowEnding(dataset.today, PATTERN_DAYS);
  const ended = dataset.challenges.filter((challenge) => challenge.endDate && inWindow(challenge.endDate, window));
  const completed = ended.filter((challenge) => challenge.status === "COMPLETED");
  const early = ended.filter((challenge) => challenge.status === "ENDED" || challenge.status === "ABANDONED");

  if (completed.length > 0) {
    return [
      {
        key: "challenges-finished",
        tone: "strength",
        title: completed.length === 1 ? `You finished ${completed[0].title}.` : `You finished ${completed.length} challenges recently.`,
        evidence: `${plural(completed.length, "challenge")} completed in the last 12 weeks${early.length ? `, ${early.length} set down or run out` : ""}.`,
        weight: 30,
        recommendation: null,
      },
    ];
  }
  if (early.length >= 2) {
    return [
      {
        key: "challenges-early",
        tone: "watch",
        title: "Challenges have been ending before the finish.",
        evidence: `${plural(early.length, "challenge")} set down or run out in the last 12 weeks, none completed.`,
        weight: 45,
        recommendation: {
          title: "Try a shorter challenge",
          detail: "A 7-day challenge you finish does more for momentum than a 30-day one you don't.",
          href: "/journey/challenges",
          actionLabel: "Browse challenges",
        },
      },
    ];
  }
  return [];
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/** Below this, any "pattern" would be noise. */
export const MIN_COMPLETIONS_FOR_PATTERNS = 5;

export function hasEnoughHistory(dataset: AnalyticsDataset): boolean {
  const window = windowEnding(dataset.today, PATTERN_DAYS);
  return questCounts(dataset.quests, { window }).completed >= MIN_COMPLETIONS_FOR_PATTERNS;
}

export function detectPatterns(dataset: AnalyticsDataset): Pattern[] {
  if (!hasEnoughHistory(dataset)) return [];
  return [
    ...goalPatterns(dataset),
    ...activityPatterns(dataset),
    ...projectPatterns(dataset),
    ...timeOfDayPatterns(dataset),
    ...difficultyPatterns(dataset),
    ...skillPatterns(dataset),
    ...challengePatterns(dataset),
  ].sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key));
}
