import type { QuestStatus } from "@/generated/prisma/enums";

export type QuestAction = "start" | "complete" | "skip" | "defer" | "restore" | "undo" | "swap";

export const MAX_SWAPS_PER_QUEST = 2;

export type QuestState = {
  status: QuestStatus;
  slot: string;
  isCore: boolean;
  carriedFromId: string | null;
  swapCount: number;
};

/**
 * What the user may do with a quest right now. Only today's quests can
 * change; past days are a record, not a to-do list.
 */
export function allowedActions(quest: QuestState, isToday: boolean): QuestAction[] {
  if (!isToday) return [];
  switch (quest.status) {
    case "PENDING": {
      const actions: QuestAction[] = ["start", "complete", "skip"];
      // A quest can move to tomorrow once; after that, skipping is kinder.
      if (quest.isCore && !quest.carriedFromId) actions.push("defer");
      // The goal slot follows the roadmap and experiment quests follow their
      // experiment, so there's nothing to swap either of them to.
      const followsAPlan = quest.slot === "PERSONAL_GOAL" || quest.slot.startsWith("EXPERIMENT");
      if (!followsAPlan && !quest.carriedFromId && quest.swapCount < MAX_SWAPS_PER_QUEST) {
        actions.push("swap");
      }
      return actions;
    }
    case "IN_PROGRESS": {
      const actions: QuestAction[] = ["complete", "skip"];
      if (quest.isCore && !quest.carriedFromId) actions.push("defer");
      return actions;
    }
    case "COMPLETED":
      return ["undo"];
    case "SKIPPED":
    case "DEFERRED":
      return ["restore"];
    case "EXPIRED":
      return [];
  }
}

export function can(quest: QuestState, action: QuestAction, isToday: boolean): boolean {
  return allowedActions(quest, isToday).includes(action);
}

/** "No problem. What got in the way?" (spec §55) */
export const SKIP_REASONS = [
  { key: "NO_TIME", label: "Ran out of time" },
  { key: "LOW_ENERGY", label: "Not enough energy" },
  { key: "NOT_POSSIBLE", label: "Couldn't do it today" },
  { key: "NOT_FOR_ME", label: "Not right for me" },
  { key: "OTHER", label: "Something else" },
] as const;

export type SkipReason = (typeof SKIP_REASONS)[number]["key"];

export function skipReasonLabel(key: string | null): string | null {
  return SKIP_REASONS.find((r) => r.key === key)?.label ?? null;
}

export type DayProgress = {
  coreTotal: number;
  coreCompleted: number;
  /** Core quests that are finished one way or another (done, skipped, deferred). */
  coreResolved: number;
  bonusCompleted: number;
  inProgress: number;
  plannedXp: number;
  /** XP from completed quests — recorded now, awarded by the progression engine later. */
  completedXp: number;
  percent: number;
  allCoreCompleted: boolean;
};

export function dayProgress(
  quests: readonly { status: QuestStatus; isCore: boolean; xpReward: number }[],
): DayProgress {
  const core = quests.filter((q) => q.isCore);
  const coreCompleted = core.filter((q) => q.status === "COMPLETED").length;
  const coreResolved = core.filter((q) => ["COMPLETED", "SKIPPED", "DEFERRED"].includes(q.status)).length;
  return {
    coreTotal: core.length,
    coreCompleted,
    coreResolved,
    bonusCompleted: quests.filter((q) => !q.isCore && q.status === "COMPLETED").length,
    inProgress: quests.filter((q) => q.status === "IN_PROGRESS").length,
    plannedXp: quests.reduce((sum, q) => sum + q.xpReward, 0),
    completedXp: quests.filter((q) => q.status === "COMPLETED").reduce((sum, q) => sum + q.xpReward, 0),
    percent: core.length ? Math.round((coreCompleted / core.length) * 100) : 0,
    allCoreCompleted: core.length > 0 && coreCompleted === core.length,
  };
}
