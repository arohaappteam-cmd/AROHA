import type { UnlockedAchievement } from "@/modules/achievements/catalogue";
import type { ChallengeQuestOutcome } from "@/modules/challenges/outcome";
import type { ProgressionOutcome } from "@/modules/progression/outcome";
import type { SkillAwardOutcome } from "@/modules/skills/outcome";

/** What completing a quest returns to the UI, so it can celebrate properly. */
export type QuestCompletionPayload = {
  missionCompleted: boolean;
  progression: ProgressionOutcome;
  /** Skill progress the quest produced; null when it trained no catalogued skill. */
  skill: SkillAwardOutcome | null;
  /** Challenge days this quest earned, if any. */
  challenges: ChallengeQuestOutcome | null;
  /** The experiment practice day this quest earned, if it was an experiment quest. */
  experiment: { experimentTitle: string; daysPracticed: number } | null;
  /** Achievements this completion newly unlocked. */
  achievements: UnlockedAchievement[];
};
