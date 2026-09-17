import { z } from "zod";

import type { DayEnergy, LifeArea, QuestDifficulty, QuestStatus } from "@/generated/prisma/enums";
import type { Preferences } from "@/modules/identity/preferences";
import type { ReflectionSignal } from "@/modules/reflection/reflection";

import type { QuestSlot } from "./categories";
import { questPayloadSchema } from "./payload";

/** Everything a generator may use to personalise a day (spec §4, §54). */
export type QuestGenerationContext = {
  userId: string;
  /** The user's calendar date, "YYYY-MM-DD". */
  date: string;
  energy: DayEnergy;
  preferences: Preferences;
  interests: { label: string; lifeArea: LifeArea | null }[];
  focusAreas: LifeArea[];
  majorGoal: {
    id: string;
    title: string;
    hasRoadmap: boolean;
    next: {
      milestoneTitle: string;
      missionId: string | null;
      missionTitle: string | null;
    } | null;
  } | null;
  /** Template keys used in the last few days, most recent first. */
  recentTemplateKeys: string[];
  /** How each slot went on the most recent previous day. */
  previousOutcomes: Partial<Record<QuestSlot, QuestStatus>>;
  /** Quests the user deferred from their previous day, to offer again. */
  carryOvers: CarryOver[];
  /** What the most recent end-of-day reflection said (spec §45). */
  lastReflection?: ReflectionSignal | null;
};

export type CarryOver = { questId: string; draft: QuestDraft };

/**
 * A generated quest before the backend prices it. AI-generated drafts will
 * be validated with `questDraftSchema`; XP is always added by the backend.
 */
export const questDraftSchema = z.object({
  slot: z.string().min(1).max(20),
  lifeArea: z.string().min(1).max(40),
  isCore: z.boolean(),
  templateKey: z.string().min(1).max(80),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500),
  steps: z.array(z.string().trim().min(1).max(160)).max(6),
  payload: questPayloadSchema.nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  estimatedMinutes: z.number().int().min(1).max(240),
  rationale: z.string().trim().max(240),
  goalId: z.string().max(64).nullable(),
  missionId: z.string().max(64).nullable(),
  carriedFromId: z.string().max(64).nullable(),
});

export type QuestDraft = Omit<z.infer<typeof questDraftSchema>, "slot" | "lifeArea" | "difficulty"> & {
  slot: QuestSlot;
  lifeArea: LifeArea;
  difficulty: QuestDifficulty;
};

export type GeneratedDay = {
  drafts: QuestDraft[];
  rationale: string;
  generator: string;
};

export interface QuestGenerator {
  readonly name: string;
  generateDay(context: QuestGenerationContext): Promise<GeneratedDay>;
  /** A different quest for one slot (used for swaps and energy changes). */
  generateSlot(
    context: QuestGenerationContext,
    slot: QuestSlot,
    options: { nonce: number; excludeTemplateKeys: string[]; avoidTags?: string[] },
  ): Promise<QuestDraft | null>;
}
