import type { AttributeAward } from "./awards";
import type { TierTitle } from "./levels";

/**
 * The result of a progression award, shared between the engine and the UI.
 * Kept free of server-only imports so client components can render the
 * level-up moment.
 */
export type ProgressionOutcome = {
  /** False when the award was a duplicate, or the XP was invalid. */
  awarded: boolean;
  /** Positive for an award, negative when an award is revoked. */
  xpAwarded: number;
  totalXp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  tier: TierTitle;
  /** 0–100 progress toward the next level, after the change. */
  percent: number;
  xpToNextLevel: number;
  attributes: AttributeAward[];
};
