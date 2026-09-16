/**
 * The result of a skill award, shared between the skill service and the UI.
 * Kept free of server-only imports so client components can render it.
 */
export type SkillAwardOutcome = {
  /** False when the award was a duplicate or nothing matched. */
  awarded: boolean;
  treeSlug: string;
  treeName: string;
  skillSlug: string;
  skillName: string;
  xpAwarded: number;
  xp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  mastered: boolean;
  levelLabel: string;
  /** Skills this award newly opened up (spec §16). */
  unlocked: { slug: string; name: string }[];
};
