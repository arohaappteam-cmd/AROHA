/**
 * Level curve — deterministic, owned by the backend (spec §6, §13).
 *
 * Total XP required to *reach* level L is floor(BASE × (L − 1)^EXPONENT).
 * With a balanced day worth ~170 XP this puts level 10 at roughly two weeks
 * and level 100 well beyond a year of consistent real-world action.
 */
const BASE_XP = 100;
const EXPONENT = 1.5;

export const MIN_LEVEL = 1;

export function xpRequiredForLevel(level: number): number {
  if (!Number.isInteger(level) || level < MIN_LEVEL) {
    throw new RangeError(`Level must be an integer >= ${MIN_LEVEL}`);
  }
  return Math.floor(BASE_XP * Math.pow(level - 1, EXPONENT));
}

export function levelForXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = MIN_LEVEL;
  while (xpRequiredForLevel(level + 1) <= xp) level++;
  return level;
}

export type LevelProgress = {
  level: number;
  totalXp: number;
  /** XP earned since reaching the current level. */
  xpIntoLevel: number;
  /** XP span between the current level and the next. */
  xpForNextLevel: number;
  xpToNextLevel: number;
  /** 0–100, rounded down. */
  percent: number;
};

export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelForXp(xp);
  const floor = xpRequiredForLevel(level);
  const ceiling = xpRequiredForLevel(level + 1);
  const span = ceiling - floor;
  const into = xp - floor;

  return {
    level,
    totalXp: xp,
    xpIntoLevel: into,
    xpForNextLevel: span,
    xpToNextLevel: ceiling - xp,
    percent: Math.floor((into / span) * 100),
  };
}

/** Progression tiers from spec §13 and character evolution from §30. */
const TIERS = [
  { minLevel: 100, title: "Master" },
  { minLevel: 50, title: "Advanced" },
  { minLevel: 25, title: "Practitioner" },
  { minLevel: 10, title: "Explorer" },
  { minLevel: 1, title: "Beginner" },
] as const;

export type TierTitle = (typeof TIERS)[number]["title"];

/** The tiers in the order they're reached, lowest first. */
export const TIER_LADDER: readonly { minLevel: number; title: TierTitle }[] = [...TIERS].reverse();

export function tierForLevel(level: number): TierTitle {
  return (TIERS.find((tier) => level >= tier.minLevel) ?? TIERS.at(-1)!).title;
}
