import type { Attribute, LifeArea } from "@/generated/prisma/enums";

/**
 * How completed real-world action turns into character progression
 * (spec §12–14). Deterministic and backend-owned: generators — including the
 * AI Mentor — never set XP or attribute gains.
 *
 * These are AROHA progression indicators, not measurements of a person.
 */

/** Largest XP a single action may ever be worth. Anything above is rejected. */
export const MAX_AWARDABLE_XP = 500;

export type AttributeAward = { attribute: Attribute; amount: number };

/**
 * Which attributes an area of life feeds, and in what proportion. Weights per
 * area sum to 1, so an award distributes exactly its XP across attributes.
 */
const ATTRIBUTE_WEIGHTS: Record<LifeArea, Partial<Record<Attribute, number>>> = {
  PHYSICAL: { STRENGTH: 1 },
  MENTAL: { DISCIPLINE: 0.6, INTELLECT: 0.4 },
  LEARNING: { INTELLECT: 0.7, SKILLS: 0.3 },
  SOCIAL: { SOCIAL: 1 },
  PERSONAL_GOAL: { DISCIPLINE: 0.6, SKILLS: 0.4 },
  CREATIVITY: { CREATIVITY: 1 },
  EXPERIENCES: { CREATIVITY: 0.5, SOCIAL: 0.5 },
  CAREER: { SKILLS: 0.6, INTELLECT: 0.4 },
  FINANCE: { INTELLECT: 0.6, DISCIPLINE: 0.4 },
  SKILLS: { SKILLS: 1 },
  RELATIONSHIPS: { SOCIAL: 1 },
  PERSONAL_DEVELOPMENT: { DISCIPLINE: 0.6, INTELLECT: 0.4 },
};

/** True for XP the engine is willing to award: a positive, sane integer. */
export function isAwardableXp(xp: number): boolean {
  return Number.isInteger(xp) && xp > 0 && xp <= MAX_AWARDABLE_XP;
}

/**
 * Splits an award across its attributes so the parts sum to exactly `xp`
 * (largest-remainder). Stable order, so the same input always splits the same.
 */
export function attributeAwards(lifeArea: LifeArea, xp: number): AttributeAward[] {
  if (!isAwardableXp(xp)) return [];

  const weights = Object.entries(ATTRIBUTE_WEIGHTS[lifeArea]) as [Attribute, number][];
  const sorted = [...weights].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const parts = sorted.map(([attribute, weight]) => {
    const exact = xp * weight;
    return { attribute, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  let left = xp - parts.reduce((sum, part) => sum + part.floor, 0);
  // Hand the rounding leftovers to the largest remainders first.
  for (const part of [...parts].sort((a, b) => b.remainder - a.remainder || a.attribute.localeCompare(b.attribute))) {
    if (left <= 0) break;
    part.floor += 1;
    left -= 1;
  }

  return parts.filter((part) => part.floor > 0).map((part) => ({ attribute: part.attribute, amount: part.floor }));
}
