import type { ProgressionOutcome } from "@/modules/progression/outcome";

/** What completing a quest returns to the UI, so it can celebrate properly. */
export type QuestCompletionPayload = {
  missionCompleted: boolean;
  progression: ProgressionOutcome;
};
