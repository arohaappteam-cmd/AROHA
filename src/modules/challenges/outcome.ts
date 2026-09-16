/**
 * What a quest completion did for challenges, shared between the challenge
 * service and the UI. Kept free of server-only imports.
 */
export type ChallengeCredit = {
  id: string;
  title: string;
  emoji: string;
  daysDone: number;
  targetDays: number;
  /** True when this credit finished the challenge. */
  completed: boolean;
  /** Bonus XP awarded on completion (0 otherwise). */
  xpAwarded: number;
};

export type ChallengeQuestOutcome = {
  credited: ChallengeCredit[];
};
