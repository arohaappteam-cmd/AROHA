import { z } from "zod";

import { QuestDifficulty } from "@/generated/prisma/enums";

import { CORE_SLOTS } from "../quests/categories";

/**
 * Schemas the AI Mentor's output must satisfy. `generateStructured` validates
 * against these; anything invalid is rejected and the caller falls back. XP,
 * ids and progression are never accepted from the model — callers re-derive
 * them (spec §6).
 */

const shortText = z.string().trim().min(1).max(200);
const sentence = z.string().trim().min(1).max(400);

// ─── Insights ───────────────────────────────────────────────────────────────

export const insightsSchema = z.object({
  headline: z.string().trim().min(1).max(200),
  analysis: z.object({
    summary: sentence,
    wins: z.array(shortText).max(5),
    watchOuts: z.array(shortText).max(5),
  }),
  recommendations: z
    .array(
      z.object({
        title: shortText,
        detail: sentence,
        // The model may suggest an in-app path; the UI only follows a small allowlist.
        href: z.string().trim().max(200).nullable().default(null),
        actionLabel: shortText.nullable().default(null),
      }),
    )
    .max(6),
  skillGaps: z
    .array(z.object({ label: shortText, detail: sentence }))
    .max(6),
  goalGuidance: z
    .object({
      guidance: sentence,
      nextActions: z.array(shortText).max(4),
    })
    .nullable()
    .default(null),
});
export type InsightsDraft = z.infer<typeof insightsSchema>;

// ─── Discovery (learning experience) ─────────────────────────────────────────

export const discoverySchema = z.object({
  title: z.string().trim().min(3).max(120),
  minutes: z.number().int().min(1).max(15),
  hook: z.string().trim().min(1).max(200),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(1).max(80),
        body: z.string().trim().min(1).max(700),
      }),
    )
    .min(2)
    .max(4),
  keyIdea: z.string().trim().min(1).max(280),
  reflectionPrompt: z.string().trim().min(1).max(200),
  tags: z.array(z.string().trim().min(1).max(30)).max(8),
});
export type DiscoveryDraft = z.infer<typeof discoverySchema>;

// ─── Daily quest personalisation ──────────────────────────────────────────────

/** Content the AI may author for one core slot. Slot, area, XP, goal linkage
 *  and payload stay backend-owned; the model only shapes the wording and
 *  calibration. */
export const questContentSchema = z.object({
  slot: z.enum(CORE_SLOTS),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(1).max(300),
  steps: z.array(z.string().trim().min(1).max(160)).min(1).max(5),
  difficulty: z.enum(QuestDifficulty),
  estimatedMinutes: z.number().int().min(1).max(240),
  rationale: z.string().trim().min(1).max(240),
});
export type QuestContentDraft = z.infer<typeof questContentSchema>;

export const questContentSetSchema = z.object({
  rationale: z.string().trim().max(280),
  quests: z.array(questContentSchema).max(CORE_SLOTS.length),
});
export type QuestContentSet = z.infer<typeof questContentSetSchema>;
