"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { validationFailure, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/server/auth/current-user";
import * as challenges from "@/server/services/challenge.service";

// Server Functions receive untrusted input: everything is re-parsed here.

const templateKeySchema = z.string().min(1).max(60);
const challengeIdSchema = z.string().min(1).max(60);

async function run(task: () => Promise<unknown>, message: string): Promise<ActionResult> {
  try {
    await task();
  } catch (error) {
    if (error instanceof challenges.ChallengeError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  // Challenges show on Journey and influence Home.
  revalidatePath("/", "layout");
  return { ok: true, message };
}

export async function startChallengeAction(templateKey: unknown): Promise<ActionResult> {
  const parsed = templateKeySchema.safeParse(templateKey);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => challenges.startChallenge(user, parsed.data), "Challenge on. Days are earned by completing matching quests.");
}

export async function abandonChallengeAction(challengeId: unknown): Promise<ActionResult> {
  const parsed = challengeIdSchema.safeParse(challengeId);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => challenges.abandonChallenge(user, parsed.data), "Challenge set down. The days you did are still yours.");
}
