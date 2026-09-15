import "server-only";

import { getCurrentUser } from "@/server/auth/current-user";
import { progressionRepository } from "@/server/repositories/progression.repository";

import { getCharacterSheet, type CharacterSheet } from "./character.service";
import { getMajorGoalCard, type GoalCard } from "./goal-view.service";

export type DashboardData = {
  user: { id: string; displayName: string; timezone: string };
  appearance: CharacterSheet["character"]["appearance"];
  progress: CharacterSheet["progress"];
  attributes: CharacterSheet["attributes"];
  focus: CharacterSheet["focus"];
  setup: CharacterSheet["setup"];
  majorGoal: GoalCard | null;
  activeGoalCount: number;
  achievementCount: number;
  bestStreak: { key: string; count: number } | null;
};

export async function getDashboardData(): Promise<DashboardData> {
  const user = await getCurrentUser();

  const [sheet, majorGoal, streak] = await Promise.all([
    getCharacterSheet(),
    getMajorGoalCard(user.id),
    progressionRepository.getLongestActiveStreak(user.id),
  ]);

  return {
    user: { id: user.id, displayName: sheet.user.displayName, timezone: sheet.user.timezone },
    appearance: sheet.character.appearance,
    progress: sheet.progress,
    attributes: sheet.attributes,
    focus: sheet.focus,
    setup: sheet.setup,
    majorGoal,
    activeGoalCount: sheet.record.activeGoals,
    achievementCount: sheet.record.achievements,
    bestStreak: streak ? { key: streak.key, count: streak.currentCount } : null,
  };
}
