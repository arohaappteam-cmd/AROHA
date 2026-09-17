import { MAX_AWARDABLE_XP } from "@/modules/progression/awards";

/**
 * Project XP — priced by the backend when a project is completed (spec §6).
 * Character XP grows with finished milestones and evidence, capped; each
 * involved skill earns in proportion to its own cost, so demonstrating a
 * deep skill is worth more than a basic one.
 */

const BASE = 100;
const PER_MILESTONE = 20;
const PER_EVIDENCE = 10;
const MAX_PROJECT_XP = 300;

export function projectXpReward(completedMilestones: number, evidenceCount: number): number {
  const xp =
    BASE + PER_MILESTONE * Math.min(5, Math.max(0, completedMilestones)) + PER_EVIDENCE * Math.min(3, Math.max(0, evidenceCount));
  return Math.min(MAX_PROJECT_XP, MAX_AWARDABLE_XP, xp);
}

export function projectSkillXp(skillBaseXp: number): number {
  return Math.min(300, Math.max(10, Math.round(skillBaseXp * 1.5)));
}
