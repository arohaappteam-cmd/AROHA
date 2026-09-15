import type { QuestDifficulty } from "@/generated/prisma/enums";

/**
 * Planned XP for a quest. Deterministic and owned by the backend (spec §6):
 * generators — including a future AI — never set XP themselves.
 *
 * This only *prices* quests. Awarding XP is the progression engine's job.
 */
const BASE_XP: Record<QuestDifficulty, number> = { EASY: 20, MEDIUM: 35, HARD: 50 };
const MAX_QUEST_XP = 100;

export function questXpReward(difficulty: QuestDifficulty, minutes: number | null, isCore: boolean): number {
  const timeBonus = Math.floor(Math.max(0, minutes ?? 0) / 10) * 5;
  const xp = Math.min(MAX_QUEST_XP, BASE_XP[difficulty] + timeBonus);
  // Bonus quests are optional extras and slightly cheaper than the core day.
  return isCore ? xp : Math.round((xp * 0.8) / 5) * 5;
}
