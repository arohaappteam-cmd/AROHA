import { z } from "zod";

import { DayMood } from "@/generated/prisma/enums";

/**
 * End-of-day reflection (spec §42, §45). Five simple questions, all
 * optional — a single honest sentence is a complete reflection.
 */

export const REFLECTION_QUESTIONS = [
  { key: "learned", label: "What did you learn today?", placeholder: "Something new — about a skill, the world, or yourself." },
  { key: "wentWell", label: "What went well?", placeholder: "Big or small. It counts." },
  { key: "difficult", label: "What was difficult?", placeholder: "No judgement — just notice it." },
  { key: "proud", label: "What are you proud of?", placeholder: "Showing up is allowed to be the answer." },
  { key: "differently", label: "What would you do differently?", placeholder: "One thing tomorrow could learn from today." },
] as const;

export type ReflectionAnswerKey = (typeof REFLECTION_QUESTIONS)[number]["key"];

export const MOOD_OPTIONS: readonly { key: DayMood; label: string; emoji: string }[] = [
  { key: "ROUGH", label: "Rough", emoji: "🌧️" },
  { key: "OKAY", label: "Okay", emoji: "⛅" },
  { key: "GOOD", label: "Good", emoji: "🌤️" },
  { key: "GREAT", label: "Great", emoji: "☀️" },
];

export function moodMeta(mood: DayMood | null | undefined) {
  return MOOD_OPTIONS.find((option) => option.key === mood) ?? null;
}

const answer = z
  .string()
  .trim()
  .max(1000, { error: "Keep each answer under 1,000 characters" })
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null);

export const reflectionInputSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use a valid date" }),
    mood: z.enum(DayMood).nullable().default(null),
    learned: answer,
    wentWell: answer,
    difficult: answer,
    proud: answer,
    differently: answer,
  })
  .refine((value) => value.mood !== null || REFLECTION_QUESTIONS.some((q) => value[q.key] !== null), {
    error: "Answer at least one question — or just pick how the day felt",
  });
export type ReflectionInput = z.infer<typeof reflectionInputSchema>;

/** How many days back a reflection can still be written or edited. */
export const REFLECTION_WINDOW_DAYS = 7;

// ─── Summary ─────────────────────────────────────────────────────────────────

export type DayFacts = {
  date: string;
  coreCompleted: number;
  coreTotal: number;
  completedTitles: string[];
  skippedTitles: string[];
  /** Notes the user wrote on quests that day. */
  questNotes: string[];
};

export type ReflectionSummary = { summary: string; suggestion: string };

export const reflectionSummarySchema = z.object({
  summary: z.string().trim().min(1).max(500),
  suggestion: z.string().trim().min(1).max(240),
});

function firstSentence(text: string, max = 110): string {
  const sentence = text.split(/(?<=[.!?])\s/)[0].trim();
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

/**
 * The deterministic summary used when AI isn't available. Built only from
 * the user's own words and the day's quest record — never invented.
 */
export function fallbackReflectionSummary(reflection: Omit<ReflectionInput, "date">, day: DayFacts): ReflectionSummary {
  const parts: string[] = [];

  if (day.coreTotal > 0) {
    parts.push(
      day.coreCompleted === day.coreTotal
        ? `You finished all ${day.coreTotal} core quests — a full day.`
        : day.coreCompleted === 0
          ? "No core quests got done today, and that's allowed."
          : `You completed ${day.coreCompleted} of ${day.coreTotal} core quests.`,
    );
  }
  if (reflection.wentWell) parts.push(`What went well: ${firstSentence(reflection.wentWell)}`);
  if (reflection.learned) parts.push(`You learned: ${firstSentence(reflection.learned)}`);
  if (reflection.proud) parts.push(`Worth being proud of: ${firstSentence(reflection.proud)}`);
  if (reflection.difficult) parts.push(`The hard part: ${firstSentence(reflection.difficult)}`);
  if (parts.length === 0) parts.push("You took a moment to check in with yourself. That's the habit that makes the rest work.");

  let suggestion: string;
  if (reflection.differently) {
    // Their own words, as written: the UI already frames it as "For tomorrow".
    suggestion = firstSentence(reflection.differently, 200);
  } else if (reflection.mood === "ROUGH") {
    suggestion = "Go gently tomorrow — a lighter day you finish beats a full one you don't.";
  } else if (day.skippedTitles.length > 0) {
    suggestion = `Something got in the way of “${day.skippedTitles[0]}”. Tomorrow, make that kind of quest smaller.`;
  } else if (day.coreTotal > 0 && day.coreCompleted === day.coreTotal) {
    suggestion = "Keep the rhythm. If today felt easy, consider a slightly more ambitious day.";
  } else {
    suggestion = "Pick the one quest that matters most tomorrow and do it first.";
  }

  return { summary: parts.join(" ").slice(0, 500), suggestion: suggestion.slice(0, 240) };
}

// ─── Signals for tomorrow ────────────────────────────────────────────────────

/**
 * What a reflection tells tomorrow's quest generation (spec §45: "use the
 * information to improve tomorrow's quests"). Deterministic and small on
 * purpose — the reflection text itself is also passed to the AI generator.
 */
export type ReflectionSignal = {
  date: string;
  mood: DayMood | null;
  /** Tomorrow should start gentler. */
  gentler: boolean;
  /** The user's own note for tomorrow, if they wrote one. */
  differently: string | null;
  difficult: string | null;
};

export function reflectionSignal(reflection: {
  date: string;
  mood: DayMood | null;
  difficult: string | null;
  differently: string | null;
}): ReflectionSignal {
  return {
    date: reflection.date,
    mood: reflection.mood,
    gentler: reflection.mood === "ROUGH",
    differently: reflection.differently,
    difficult: reflection.difficult,
  };
}
