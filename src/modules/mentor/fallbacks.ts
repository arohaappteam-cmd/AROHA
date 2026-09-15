import type { LifeArea } from "@/generated/prisma/enums";

import { LIFE_AREAS } from "../identity/life-areas";
import type { MentorInsights, MentorContext, MentorRecommendation, MentorSkillGap } from "./types";

/**
 * Deterministic mentor insights, used whenever AI is unavailable. Not a fake
 * "AI response" — it's a transparent rule-based analysis of the same context,
 * so the mentor is always useful, just less personalised.
 */
export function fallbackInsights(ctx: MentorContext): MentorInsights {
  const area = (key: LifeArea) => LIFE_AREAS[key].label.toLowerCase();
  const wins: string[] = [];
  const watchOuts: string[] = [];

  const { today, last7Days, strongAreas, neglectedAreas, commonSkipReasons } = ctx.quests;

  if (today.total > 0 && today.completed === today.total) wins.push("You've completed every quest today.");
  else if (today.completed > 0) wins.push(`You've completed ${today.completed} of ${today.total} quests today.`);
  if (last7Days.completed > 0) wins.push(`${last7Days.completed} quests done in the last 7 days.`);
  for (const a of strongAreas.slice(0, 2)) wins.push(`Strong momentum in ${area(a)}.`);

  for (const a of neglectedAreas.slice(0, 2)) watchOuts.push(`${LIFE_AREAS[a].label} has gone quiet this week.`);
  if (ctx.goals.filter((g) => g.status === "ACTIVE").length > 3) {
    watchOuts.push("You have several active goals — focusing on two or three tends to move faster.");
  }
  if (commonSkipReasons[0] === "NO_TIME") watchOuts.push("Time keeps getting in the way — lighter quests may help.");

  const recommendations = fallbackRecommendations(ctx);
  const skillGaps = fallbackSkillGaps(ctx);

  const headline = ctx.majorGoal
    ? `You're a level ${ctx.progression.level} ${ctx.progression.tier.toLowerCase()}, working toward “${ctx.majorGoal.title}”.`
    : `You're a level ${ctx.progression.level} ${ctx.progression.tier.toLowerCase()}. Let's find a goal worth chasing.`;

  const summary =
    last7Days.completed === 0
      ? "A fresh start. Pick one small quest today and let momentum build."
      : `You've completed ${last7Days.completed} quests this week. ${
          neglectedAreas.length ? `Consider giving ${area(neglectedAreas[0])} some attention.` : "Nicely balanced across your life areas."
        }`;

  return {
    headline,
    analysis: { summary, wins, watchOuts },
    recommendations,
    skillGaps,
    goalGuidance: ctx.majorGoal
      ? {
          goalId: ctx.majorGoal.id,
          guidance: ctx.majorGoal.nextStep
            ? `The next concrete step on “${ctx.majorGoal.title}” is ${ctx.majorGoal.nextStep}. Small, regular sessions beat occasional big pushes.`
            : `“${ctx.majorGoal.title}” needs its next steps mapped out. Break it into missions you can finish in a week each.`,
          nextActions: ctx.majorGoal.nextStep
            ? [`Spend focused time on: ${ctx.majorGoal.nextStep}`, "Note where you stop, so tomorrow starts fast"]
            : ["Open the goal and add its next milestones", "Make the first mission small enough to finish today"],
        }
      : null,
  };
}

function fallbackRecommendations(ctx: MentorContext): MentorRecommendation[] {
  const recs: MentorRecommendation[] = [];
  if (!ctx.majorGoal) {
    recs.push({
      title: "Choose a goal worth pursuing",
      detail: "Everything in AROHA gets sharper once you have one clear goal. Pick something you'd be proud of in a few months.",
      href: "/goals/new",
      actionLabel: "Create a goal",
    });
  } else if (ctx.majorGoal.milestoneCount === 0) {
    recs.push({
      title: `Map out “${ctx.majorGoal.title}”`,
      detail: "Turn the goal into milestones and missions so daily quests can draw real steps from it.",
      href: `/goals/${ctx.majorGoal.id}`,
      actionLabel: "Open goal",
    });
  }
  if (ctx.quests.neglectedAreas.length > 0) {
    const a = LIFE_AREAS[ctx.quests.neglectedAreas[0]];
    recs.push({
      title: `Reconnect with ${a.label.toLowerCase()}`,
      detail: `${a.label} has been quiet this week. A small quest today is enough to restart it.`,
      href: null,
      actionLabel: null,
    });
  }
  if (ctx.interests.length === 0) {
    recs.push({
      title: "Tell AROHA what you're into",
      detail: "Add a few interests so learning quests and discoveries match your curiosity.",
      href: "/character/edit#interests",
      actionLabel: "Add interests",
    });
  }
  if (recs.length === 0) {
    recs.push({
      title: "Keep the streak of showing up",
      detail: "You're balanced across your life areas. Pick the quest that feels most alive today and start there.",
      href: null,
      actionLabel: null,
    });
  }
  return recs.slice(0, 4);
}

function fallbackSkillGaps(ctx: MentorContext): MentorSkillGap[] {
  return ctx.goals
    .filter((g) => g.status === "ACTIVE")
    .slice(0, 3)
    .map((g) => ({
      label: g.title,
      detail: g.nextStep
        ? `Next capability to build: ${g.nextStep}.`
        : g.milestoneCount === 0
          ? "Start by mapping this goal into milestones."
          : "Keep progressing through its missions.",
    }));
}
