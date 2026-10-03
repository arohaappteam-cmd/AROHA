import type { PlanTier } from "@/generated/prisma/enums";

/**
 * AROHA's three tiers. Free is the whole core game; Pro adds room and
 * history; Premium adds AI. Payments aren't live yet, so the paid tiers are
 * "coming soon" — they can be granted by hand (npm run plan:set) — and
 * nothing here charges anyone.
 *
 * Prices: set `price` when payments launch; null renders as "Coming soon".
 */

export const PLAN_TIERS = ["FREE", "PRO", "PREMIUM"] as const satisfies readonly PlanTier[];

/** Capabilities a tier switches on. */
export type PlanFeature =
  /** The Insights page: trends, balance, goal momentum and patterns. */
  | "insights"
  /** Journey ranges beyond 30 days: 90 days, 6 months, a year, all time. */
  | "journeyHistory"
  /** AI-written quests, roadmaps, reflection summaries, insight reports and assessment feedback. */
  | "ai"
  /** The AI Mentor conversation. */
  | "mentor";

/** Counted limits. `null` means unlimited. */
export type PlanLimit = "activeGoals" | "activeProjects" | "activeExperiments";

export type PlanInfo = {
  tier: PlanTier;
  name: string;
  tagline: string;
  /** Display price, e.g. "₹149 / month". Null until payments launch. */
  price: string | null;
  /** Whether people can be on this tier today (purchasable or free). */
  available: boolean;
  highlights: readonly string[];
};

export const PLANS: Record<PlanTier, PlanInfo> = {
  FREE: {
    tier: "FREE",
    name: "Free",
    tagline: "The whole core game. Free forever.",
    price: "Free",
    available: true,
    highlights: [
      "Daily quests across every life area",
      "Character, levels, attributes and skill trees",
      "Up to 3 active goals with roadmaps",
      "Up to 2 active projects with proof",
      "Assessments and your Skill Passport",
      "Journal, daily reflection and timeline",
      "Challenges, streaks and achievements",
      "1 experiment at a time",
      "Community, guilds, leaderboards and mentorship",
      "Journey map for the last 30 days",
    ],
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    tagline: "More room, and your whole history.",
    price: null,
    available: false,
    highlights: [
      "Everything in Free",
      "Unlimited goals and projects",
      "2 experiments at a time",
      "Insights: trends, life-area balance and patterns",
      "Full Journey history: 90 days, 6 months, a year, all time",
    ],
  },
  PREMIUM: {
    tier: "PREMIUM",
    name: "Premium",
    tagline: "An AI mentor that grows with you.",
    price: null,
    available: false,
    highlights: [
      "Everything in Pro",
      "AI Mentor: conversation, guidance and recommendations",
      "AI-personalised daily quests and goal roadmaps",
      "AI summaries of your reflections",
      "AI insight reports and assessment feedback",
    ],
  },
};

/** Rows of the comparison table: true/false, or a short value per tier. */
export const PLAN_COMPARISON: readonly { label: string; values: Record<PlanTier, boolean | string> }[] = [
  { label: "Daily quests & today's journey", values: { FREE: true, PRO: true, PREMIUM: true } },
  { label: "Character, levels & skill trees", values: { FREE: true, PRO: true, PREMIUM: true } },
  { label: "Active goals with roadmaps", values: { FREE: "3", PRO: "Unlimited", PREMIUM: "Unlimited" } },
  { label: "Active projects", values: { FREE: "2", PRO: "Unlimited", PREMIUM: "Unlimited" } },
  { label: "Experiments at a time", values: { FREE: "1", PRO: "2", PREMIUM: "2" } },
  { label: "Assessments & Skill Passport", values: { FREE: true, PRO: true, PREMIUM: true } },
  { label: "Journal, reflection & timeline", values: { FREE: true, PRO: true, PREMIUM: true } },
  { label: "Challenges, streaks & achievements", values: { FREE: true, PRO: true, PREMIUM: true } },
  { label: "Community, guilds & mentorship", values: { FREE: true, PRO: true, PREMIUM: true } },
  { label: "Journey map history", values: { FREE: "30 days", PRO: "All time", PREMIUM: "All time" } },
  { label: "Insights & patterns", values: { FREE: false, PRO: true, PREMIUM: true } },
  { label: "AI-personalised quests & roadmaps", values: { FREE: false, PRO: false, PREMIUM: true } },
  { label: "AI reflection summaries & insight reports", values: { FREE: false, PRO: false, PREMIUM: true } },
  { label: "AI Mentor", values: { FREE: false, PRO: false, PREMIUM: true } },
];

/** The lowest tier that includes each feature. */
export const FEATURE_TIER: Record<PlanFeature, PlanTier> = {
  insights: "PRO",
  journeyHistory: "PRO",
  ai: "PREMIUM",
  mentor: "PREMIUM",
};

export const PLAN_LIMITS: Record<PlanTier, Record<PlanLimit, number | null>> = {
  FREE: { activeGoals: 3, activeProjects: 2, activeExperiments: 1 },
  PRO: { activeGoals: null, activeProjects: null, activeExperiments: 2 },
  PREMIUM: { activeGoals: null, activeProjects: null, activeExperiments: 2 },
};

const LIMIT_NOUNS: Record<PlanLimit, [singular: string, plural: string]> = {
  activeGoals: ["active goal", "active goals"],
  activeProjects: ["active project", "active projects"],
  activeExperiments: ["experiment at a time", "experiments at a time"],
};

export function tierRank(tier: PlanTier): number {
  return PLAN_TIERS.indexOf(tier);
}

/** True when `plan` is `required` or above. */
export function includesTier(plan: PlanTier, required: PlanTier): boolean {
  return tierRank(plan) >= tierRank(required);
}

export function hasFeature(plan: PlanTier, feature: PlanFeature): boolean {
  return includesTier(plan, FEATURE_TIER[feature]);
}

export function limitFor(plan: PlanTier, limit: PlanLimit): number | null {
  return PLAN_LIMITS[plan][limit];
}

/** Whether one more can be started when `current` are already active. */
export function canAddMore(plan: PlanTier, limit: PlanLimit, current: number): boolean {
  const max = limitFor(plan, limit);
  return max === null || current < max;
}

/** The first tier above `plan` that raises `limit`, if any. */
export function nextTierFor(plan: PlanTier, limit: PlanLimit): PlanTier | null {
  const current = limitFor(plan, limit);
  for (const tier of PLAN_TIERS.slice(tierRank(plan) + 1)) {
    const max = limitFor(tier, limit);
    if (current !== null && (max === null || max > current)) return tier;
  }
  return null;
}

export function describeLimit(limit: PlanLimit, max: number): string {
  const [singular, plural] = LIMIT_NOUNS[limit];
  return `${max} ${max === 1 ? singular : plural}`;
}

/** What to tell someone who has hit a limit — never a dead end. */
export function limitReachedMessage(plan: PlanTier, limit: PlanLimit): string {
  const max = limitFor(plan, limit);
  const next = nextTierFor(plan, limit);
  const included = max === null ? "" : `The ${PLANS[plan].name} plan includes ${describeLimit(limit, max)}. `;
  const finish =
    limit === "activeExperiments"
      ? "Wrap one up to start another"
      : limit === "activeGoals"
        ? "Complete or archive one to make room"
        : "Finish one to make room";
  const upgrade = next ? ` — ${PLANS[next].name} (coming soon) raises the limit.` : ".";
  return `${included}${finish}${upgrade}`;
}

/** Journey ranges every plan can chart; longer ones need `journeyHistory`. */
export const FREE_JOURNEY_RANGES: readonly string[] = ["7d", "30d"];

export function canUseJourneyRange(plan: PlanTier, range: string): boolean {
  return FREE_JOURNEY_RANGES.includes(range) || hasFeature(plan, "journeyHistory");
}

/** Parses a tier name typed by a person ("pro", "Premium"). */
export function parsePlanTier(value: string): PlanTier | null {
  const upper = value.trim().toUpperCase();
  return (PLAN_TIERS as readonly string[]).includes(upper) ? (upper as PlanTier) : null;
}
