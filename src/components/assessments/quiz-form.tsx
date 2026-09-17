"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicQuizQuestion } from "@/modules/assessments/grading";
import { submitQuizAction } from "@/server/actions/assessment.actions";

/** Answers go to the server, which grades them against a key the page never sees. */
export function QuizForm({ assessmentKey, questions }: { assessmentKey: string; questions: readonly PublicQuizQuestion[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const answered = answers.filter((answer) => answer !== null).length;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (answers.some((answer) => answer === null)) {
          setError("Answer every question before submitting");
          return;
        }
        startTransition(async () => {
          const result = await submitQuizAction({ assessmentKey, answers });
          if (!result.ok) setError(result.error);
        });
      }}
    >
      <ol className="space-y-5">
        {questions.map((question, index) => (
          <li key={index} className="space-y-2.5 rounded-xl border p-4">
            <p className="font-medium">
              <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
              {question.prompt}
            </p>
            <div role="radiogroup" aria-label={`Question ${index + 1}`} className="grid gap-2 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => {
                const chosen = answers[index] === optionIndex;
                return (
                  <label
                    key={optionIndex}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                      chosen ? "border-primary bg-primary/10" : "hover:border-primary/50",
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${index}`}
                      checked={chosen}
                      onChange={() => setAnswers((current) => current.map((value, i) => (i === index ? optionIndex : value)))}
                      className="mt-0.5 accent-[var(--primary)]"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          Submit answers
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {answered} of {questions.length} answered
        </span>
      </div>
    </form>
  );
}
