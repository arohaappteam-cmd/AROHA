"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DayMood } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { MOOD_OPTIONS, REFLECTION_QUESTIONS, type ReflectionAnswerKey } from "@/modules/reflection/reflection";
import { saveDailyReflectionAction } from "@/server/actions/journal.actions";
import { Glyph } from "@/components/common/glyph";

type Answers = Record<ReflectionAnswerKey, string>;

/** The end-of-day questions. Every one is optional; one honest line is enough. */
export function ReflectionForm({
  date,
  initial,
  saved,
}: {
  date: string;
  initial: { mood: DayMood | null } & Partial<Record<ReflectionAnswerKey, string | null>>;
  saved: boolean;
}) {
  const [mood, setMood] = useState<DayMood | null>(initial.mood);
  const [answers, setAnswers] = useState<Answers>(
    () => Object.fromEntries(REFLECTION_QUESTIONS.map((q) => [q.key, initial[q.key] ?? ""])) as Answers,
  );
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setResult(await saveDailyReflectionAction({ date, mood, ...answers }));
        });
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">How did today feel?</legend>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((option) => {
            const active = mood === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMood(active ? null : option.key)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  active ? "border-primary bg-primary/12 font-medium text-primary" : "hover:border-primary/50",
                )}
              >
                <span aria-hidden><Glyph emoji={option.emoji} /></span>
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {REFLECTION_QUESTIONS.map((question) => (
        <div key={question.key} className="space-y-1.5">
          <Label htmlFor={`reflection-${question.key}`}>{question.label}</Label>
          <Textarea
            id={`reflection-${question.key}`}
            rows={2}
            maxLength={1000}
            value={answers[question.key]}
            onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}
            placeholder={question.placeholder}
          />
        </div>
      ))}

      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-300">
          Saved. Your summary is ready below — and tomorrow&apos;s quests will take today into account.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          {saved ? "Update reflection" : "Save reflection"}
        </Button>
        <span className="text-xs text-muted-foreground">Answer as many or as few as you like.</span>
      </div>
    </form>
  );
}
