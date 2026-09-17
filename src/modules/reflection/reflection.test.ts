import { describe, expect, it } from "vitest";

import { journalEntrySchema, journalPreview } from "./journal";
import { fallbackReflectionSummary, reflectionInputSchema, reflectionSignal, type DayFacts } from "./reflection";

const day = (overrides: Partial<DayFacts> = {}): DayFacts => ({
  date: "2026-09-17",
  coreCompleted: 3,
  coreTotal: 5,
  completedTitles: ["Walk", "Read", "Call"],
  skippedTitles: [],
  questNotes: [],
  ...overrides,
});

const empty = { mood: null, learned: null, wentWell: null, difficult: null, proud: null, differently: null };

describe("reflection input", () => {
  it("treats blank answers as unanswered, and needs at least one answer or a mood", () => {
    const parsed = reflectionInputSchema.parse({ date: "2026-09-17", learned: "  ", wentWell: "The run" });
    expect(parsed).toMatchObject({ learned: null, wentWell: "The run", mood: null });
    expect(reflectionInputSchema.safeParse({ date: "2026-09-17" }).success).toBe(false);
    expect(reflectionInputSchema.safeParse({ date: "2026-09-17", mood: "OKAY" }).success).toBe(true);
    expect(reflectionInputSchema.safeParse({ date: "17/09/2026", mood: "OKAY" }).success).toBe(false);
  });
});

describe("fallback summary", () => {
  it("is built only from the user's words and the quest record", () => {
    const summary = fallbackReflectionSummary(
      { ...empty, wentWell: "Finally ran without stopping. Legs hurt.", learned: "Pacing matters", differently: "Start the day with the hard quest." },
      day(),
    );
    expect(summary.summary).toContain("3 of 5 core quests");
    expect(summary.summary).toContain("Finally ran without stopping.");
    expect(summary.summary).not.toContain("Legs hurt");
    expect(summary.summary).toContain("Pacing matters");
    expect(summary.suggestion).toBe("Start the day with the hard quest.");
  });

  it("is kind on rough days and celebrates full ones", () => {
    expect(fallbackReflectionSummary({ ...empty, mood: "ROUGH" }, day({ coreCompleted: 0 })).suggestion).toMatch(/gently/);
    expect(fallbackReflectionSummary({ ...empty, mood: "ROUGH" }, day({ coreCompleted: 0 })).summary).toMatch(/allowed/);
    const full = fallbackReflectionSummary({ ...empty, mood: "GREAT" }, day({ coreCompleted: 5 }));
    expect(full.summary).toContain("all 5 core quests");
    expect(full.suggestion).toMatch(/rhythm/);
  });

  it("points at a skipped quest when there's nothing else to go on", () => {
    const summary = fallbackReflectionSummary({ ...empty, mood: "OKAY" }, day({ skippedTitles: ["Go to the gym"] }));
    expect(summary.suggestion).toContain("Go to the gym");
  });
});

describe("reflection signal", () => {
  it("asks for a gentler tomorrow only after a rough day", () => {
    expect(reflectionSignal({ date: "2026-09-16", mood: "ROUGH", difficult: "Tired", differently: null }).gentler).toBe(true);
    expect(reflectionSignal({ date: "2026-09-16", mood: "GOOD", difficult: null, differently: "Sleep earlier" })).toMatchObject({
      gentler: false,
      differently: "Sleep earlier",
    });
  });
});

describe("journal entries", () => {
  it("require a body, trim titles and validate dates", () => {
    expect(journalEntrySchema.parse({ title: " ", body: "Today was long.", date: "2026-09-17" })).toMatchObject({ title: null, mood: null });
    expect(journalEntrySchema.safeParse({ body: "   ", date: "2026-09-17" }).success).toBe(false);
    expect(journalEntrySchema.safeParse({ body: "x", date: "yesterday" }).success).toBe(false);
  });

  it("previews long entries on a word boundary", () => {
    const body = "word ".repeat(100);
    const preview = journalPreview(body, 50);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(51);
    expect(journalPreview("short\n\nentry")).toBe("short entry");
  });
});
