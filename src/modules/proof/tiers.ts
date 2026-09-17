import type { AssessmentKind } from "@/generated/prisma/enums";

/**
 * Proof of Skill (spec §20): the difference between "I say I know this" and
 * "I have demonstrated this". Every skill gets a tier derived from what
 * actually exists — practice in the ledger, passed assessments, completed
 * projects with evidence. Deterministic, and nothing is self-declared.
 */

export type ProofTier = "NONE" | "PRACTICED" | "TESTED" | "DEMONSTRATED" | "MASTERED";

export const PROOF_TIER_ORDER: readonly ProofTier[] = ["NONE", "PRACTICED", "TESTED", "DEMONSTRATED", "MASTERED"];

export const PROOF_TIER_META: Record<ProofTier, { label: string; description: string }> = {
  NONE: { label: "Not started", description: "No activity yet." },
  PRACTICED: { label: "Practiced", description: "Built through completed quests and practice." },
  TESTED: { label: "Tested", description: "Understanding confirmed by a passed quiz." },
  DEMONSTRATED: { label: "Demonstrated", description: "Ability shown through a practical task or a finished project with evidence." },
  MASTERED: { label: "Mastered", description: "Top level reached and ability demonstrated in an assessed task or project." },
};

export type SkillProofFacts = {
  /** Skill XP from any source. */
  xp: number;
  /** The skill's XP level has reached its maximum. */
  atMaxLevel: boolean;
  /** Kinds of assessments passed for this skill. */
  passedKinds: ReadonlySet<AssessmentKind>;
  /** Completed projects involving this skill that carry evidence. */
  provenProjects: number;
};

export function proofTier(facts: SkillProofFacts): ProofTier {
  const abilityAssessed = facts.passedKinds.has("PRACTICAL") || facts.passedKinds.has("PROJECT");
  // Mastery needs both depth (top level) and an assessed demonstration —
  // finishing lessons or quests alone never reaches it.
  if (facts.atMaxLevel && abilityAssessed) return "MASTERED";
  if (abilityAssessed || facts.provenProjects > 0) return "DEMONSTRATED";
  if (facts.passedKinds.has("QUIZ")) return "TESTED";
  if (facts.xp > 0) return "PRACTICED";
  return "NONE";
}

/**
 * A single sortable strength for ordering the passport: demonstrated proof
 * outweighs any amount of practice.
 */
export function proofStrength(facts: SkillProofFacts): number {
  const tier = PROOF_TIER_ORDER.indexOf(proofTier(facts));
  const evidence = facts.passedKinds.size + Math.min(5, facts.provenProjects);
  return tier * 10_000 + evidence * 1_000 + Math.min(999, Math.floor(facts.xp / 10));
}

export function isAtLeast(tier: ProofTier, minimum: ProofTier): boolean {
  return PROOF_TIER_ORDER.indexOf(tier) >= PROOF_TIER_ORDER.indexOf(minimum);
}
