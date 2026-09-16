import type { ProgressionOutcome } from "@/modules/progression/outcome";
import type { SkillAwardOutcome } from "@/modules/skills/outcome";

/** What completing a quest returns to the UI, so it can celebrate properly. */
export type QuestCompletionPayload = {
  missionCompleted: boolean;
  progression: ProgressionOutcome;
  /** Skill progress the quest produced; null when it trained no catalogued skill. */
  skill: SkillAwardOutcome | null;
};
