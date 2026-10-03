import "server-only";

import type { PlanTier } from "@/generated/prisma/enums";
import { canAddMore, hasFeature, limitFor, limitReachedMessage, type PlanFeature, type PlanLimit } from "@/modules/plans/catalogue";
import { getAIProvider } from "@/server/ai";
import { planRepository } from "@/server/repositories/plan.repository";

export async function userHasFeature(userId: string, feature: PlanFeature): Promise<boolean> {
  return hasFeature(await planRepository.getPlan(userId), feature);
}

/**
 * Whether AI may run for this user: an AI provider is configured *and*
 * their plan includes AI. Checks the provider first, so with AI switched off
 * (the default) this costs nothing — no database read.
 */
export async function aiAllowedFor(userId: string): Promise<boolean> {
  if (!getAIProvider()) return false;
  return userHasFeature(userId, "ai");
}

/**
 * Null when one more fits within the user's plan, otherwise the message to
 * show (callers throw it as their own domain error, so actions already know
 * how to display it). `countActive` only runs for plans with a limit.
 */
export async function planLimitMessage(userId: string, limit: PlanLimit, countActive: () => Promise<number>): Promise<string | null> {
  const plan = await planRepository.getPlan(userId);
  if (limitFor(plan, limit) === null) return null;
  return canAddMore(plan, limit, await countActive()) ? null : limitReachedMessage(plan, limit);
}

export type PlanOverview = { plan: PlanTier; interests: PlanTier[] };

export async function getPlanOverview(user: { id: string; plan: PlanTier }): Promise<PlanOverview> {
  return { plan: user.plan, interests: await planRepository.listInterests(user.id) };
}

/** "Tell me when it launches" — paid tiers only. */
export async function setPlanInterest(userId: string, tier: PlanTier, interested: boolean): Promise<void> {
  if (tier === "FREE") return;
  if (interested) await planRepository.registerInterest(userId, tier);
  else await planRepository.withdrawInterest(userId, tier);
}
