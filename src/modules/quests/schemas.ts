import { z } from "zod";

import { DayEnergy } from "@/generated/prisma/enums";

import { SKIP_REASONS } from "./status";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters` })
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null);

export const questIdSchema = z.string().min(1).max(64);

export const completeQuestSchema = z.object({
  questId: questIdSchema,
  reflection: optionalText(1000),
  result: optionalText(120),
  evidenceUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null)
    .refine((value) => {
      if (value === null) return true;
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, { error: "Use a full link starting with https://" }),
  /** For goal quests: also mark the linked mission as complete. */
  completeMission: z.boolean().default(false),
});
export type CompleteQuestInput = z.infer<typeof completeQuestSchema>;

export const reflectionSchema = completeQuestSchema.omit({ completeMission: true });
export type ReflectionInput = z.infer<typeof reflectionSchema>;

export const skipQuestSchema = z.object({
  questId: questIdSchema,
  reason: z.enum(SKIP_REASONS.map((r) => r.key) as [string, ...string[]]),
});

export const energySchema = z.enum(DayEnergy);
