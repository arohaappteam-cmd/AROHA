"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { validationFailure, type ActionResult } from "@/lib/action-result";
import { customExperimentSchema, experimentReviewSchema, startTemplateExperimentSchema } from "@/modules/experiments/logic";
import { getCurrentUser } from "@/server/auth/current-user";
import * as experiments from "@/server/services/experiment.service";

// Server Functions receive untrusted input: everything is re-parsed here.

const idSchema = z.string().min(1).max(64);

async function run(task: () => Promise<unknown>, message: string): Promise<ActionResult> {
  try {
    await task();
  } catch (error) {
    if (error instanceof experiments.ExperimentError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  // Experiments add quests to Home and show on Discover and the timeline.
  revalidatePath("/", "layout");
  return { ok: true, message };
}

export async function startTemplateExperimentAction(input: unknown): Promise<ActionResult> {
  const parsed = startTemplateExperimentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => experiments.startTemplateExperiment(user, parsed.data.templateKey), "Experiment started — today's practice is on your quest path.");
}

export async function startCustomExperimentAction(input: unknown): Promise<ActionResult> {
  const parsed = customExperimentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => experiments.startCustomExperiment(user, parsed.data), "Experiment started — today's practice is on your quest path.");
}

export async function wrapUpExperimentAction(experimentId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(experimentId);
  if (!id.success) return validationFailure(id.error);
  const user = await getCurrentUser();
  return run(() => experiments.wrapUpExperiment(user, id.data), "Wrapped up — time for the review.");
}

export async function abandonExperimentAction(experimentId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(experimentId);
  if (!id.success) return validationFailure(id.error);
  const user = await getCurrentUser();
  return run(() => experiments.abandonExperiment(user, id.data), "Experiment set down. The days you tried still count.");
}

export async function reviewExperimentAction(input: unknown): Promise<ActionResult> {
  const parsed = experimentReviewSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  let outcome: experiments.ExperimentReviewOutcome;
  try {
    const user = await getCurrentUser();
    outcome = await experiments.reviewExperiment(user, parsed.data);
  } catch (error) {
    if (error instanceof experiments.ExperimentError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  revalidatePath("/", "layout");
  // Choosing to make it a goal lands on the new goal and its roadmap.
  if (outcome.goalId) redirect(`/goals/${outcome.goalId}`);
  return {
    ok: true,
    message: [
      "Review saved",
      outcome.xpAwarded > 0 ? `+${outcome.xpAwarded} XP` : null,
      ...outcome.achievements.map((achievement) => `${achievement.emoji} ${achievement.name}`),
    ]
      .filter(Boolean)
      .join(" · "),
  };
}
