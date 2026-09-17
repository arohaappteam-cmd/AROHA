import { z } from "zod";

import { DayMood } from "@/generated/prisma/enums";

/**
 * Private journal entries (spec §42). Free-form and owned entirely by the
 * user: never shown elsewhere in AROHA and never sent to AI.
 */

export const JOURNAL_BODY_MAX = 20_000;

export const journalEntrySchema = z.object({
  title: z
    .string()
    .trim()
    .max(120, { error: "Keep the title under 120 characters" })
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null),
  body: z
    .string()
    .trim()
    .min(1, { error: "Write something — even a line" })
    .max(JOURNAL_BODY_MAX, { error: "That entry is very long — split it into two" }),
  mood: z.enum(DayMood).nullable().default(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use a valid date" }),
});
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;

/** A short preview for lists, cut on a word boundary. */
export function journalPreview(body: string, max = 180): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`;
}
