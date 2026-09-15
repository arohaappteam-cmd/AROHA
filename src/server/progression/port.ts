import "server-only";

import type { LifeArea, QuestDifficulty } from "@/generated/prisma/enums";

import { awardXp, revokeXp, type ProgressionOutcome } from "./engine";

/**
 * The seam between the Daily Quest system and the progression engine.
 *
 * Quests call this port when completions happen; they never write XP or stats
 * themselves (spec §6). The engine validates the award, writes an auditable
 * XP transaction, and recalculates level and attributes from the ledger.
 */
export type QuestCompletedEvent = {
  userId: string;
  questId: string;
  completionId: string;
  lifeArea: LifeArea;
  difficulty: QuestDifficulty;
  xpReward: number;
  completedAt: Date;
  /** Shown in the XP history, e.g. "Walk for 20 minutes". */
  title: string;
};

export type QuestCompletionRevertedEvent = {
  userId: string;
  questId: string;
};

export interface ProgressionPort {
  readonly awardsXp: boolean;
  questCompleted(event: QuestCompletedEvent): Promise<ProgressionOutcome>;
  questCompletionReverted(event: QuestCompletionRevertedEvent): Promise<ProgressionOutcome>;
}

export const questProgression: ProgressionPort = {
  awardsXp: true,

  questCompleted(event) {
    return awardXp({
      userId: event.userId,
      amount: event.xpReward,
      // One XP transaction per quest, ever — completing twice can't double-pay.
      sourceType: "QUEST_COMPLETION",
      sourceId: event.questId,
      lifeArea: event.lifeArea,
      reason: event.title,
    });
  },

  questCompletionReverted(event) {
    return revokeXp(event.userId, "QUEST_COMPLETION", event.questId);
  },
};

export function progression(): ProgressionPort {
  return questProgression;
}

export type { ProgressionOutcome } from "./engine";
