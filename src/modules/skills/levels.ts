/**
 * Per-skill level curve — deterministic, owned by the backend (spec §15–16).
 *
 * Skills are deliberately unequal: each carries its own `baseXp` cost and
 * `maxLevel` depth. Level n costs `baseXp × n`, so reaching level L takes
 * baseXp × L(L+1)/2 XP in total — early levels come quickly, mastery is slow.
 */

/** A skill starts at level 0: seen but not yet learned. */
export const MIN_SKILL_LEVEL = 0;

/** Bounds enforced on catalogue data, so no skill is trivial or endless. */
export const SKILL_MAX_LEVEL_RANGE = { min: 1, max: 10 } as const;
export const SKILL_BASE_XP_RANGE = { min: 10, max: 500 } as const;

/** Total XP needed to *reach* `level` in a skill priced at `baseXp`. */
export function skillXpForLevel(baseXp: number, level: number): number {
  if (!Number.isInteger(level) || level < MIN_SKILL_LEVEL) {
    throw new RangeError(`Skill level must be an integer >= ${MIN_SKILL_LEVEL}`);
  }
  return baseXp * ((level * (level + 1)) / 2);
}

export function skillLevelForXp(baseXp: number, maxLevel: number, xp: number): number {
  const total = Math.max(0, Math.floor(xp));
  let level = MIN_SKILL_LEVEL;
  while (level < maxLevel && skillXpForLevel(baseXp, level + 1) <= total) level++;
  return level;
}

export type SkillProgress = {
  level: number;
  maxLevel: number;
  xp: number;
  /** True once the skill's final level is reached. */
  mastered: boolean;
  /** XP earned since the current level was reached. */
  xpIntoLevel: number;
  /** XP span between the current level and the next; 0 when mastered. */
  xpForNextLevel: number;
  xpToNextLevel: number;
  /** 0–100 toward the next level, rounded down; 100 when mastered. */
  percent: number;
};

export function getSkillProgress(baseXp: number, maxLevel: number, xp: number): SkillProgress {
  const total = Math.max(0, Math.floor(xp));
  const level = skillLevelForXp(baseXp, maxLevel, total);
  const mastered = level >= maxLevel;
  if (mastered) {
    return { level, maxLevel, xp: total, mastered, xpIntoLevel: 0, xpForNextLevel: 0, xpToNextLevel: 0, percent: 100 };
  }

  const floor = skillXpForLevel(baseXp, level);
  const ceiling = skillXpForLevel(baseXp, level + 1);
  const span = ceiling - floor;
  const into = total - floor;

  return {
    level,
    maxLevel,
    xp: total,
    mastered,
    xpIntoLevel: into,
    xpForNextLevel: span,
    xpToNextLevel: ceiling - total,
    percent: Math.floor((into / span) * 100),
  };
}

/** Rank names, scaled to the skill's own depth so short skills still end at Mastered. */
const RANKS = ["Novice", "Apprentice", "Practiced", "Advanced", "Mastered"] as const;

export function skillLevelLabel(level: number, maxLevel: number): string {
  if (level <= 0) return "Not started";
  if (level >= maxLevel || maxLevel <= 1) return RANKS.at(-1)!;
  const index = Math.round(((level - 1) / (maxLevel - 1)) * (RANKS.length - 1));
  return RANKS[Math.min(index, RANKS.length - 2)];
}
