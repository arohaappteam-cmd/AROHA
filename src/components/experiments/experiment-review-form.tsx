"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExperimentDecision, ExperimentImprovement } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { DECISION_META, IMPROVEMENT_LABEL, SCALE_LABELS } from "@/modules/experiments/logic";
import { reviewExperimentAction } from "@/server/actions/experiment.actions";

function Scale({ name, label, value, onChange }: { name: "enjoyment" | "interest"; label: string; value: number | null; onChange: (value: number) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div role="radiogroup" className="flex flex-wrap gap-1.5">
        {SCALE_LABELS[name].map((text, index) => {
          const score = index + 1;
          const active = value === score;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(score)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                active ? "border-primary bg-primary/12 font-medium text-primary" : "hover:border-primary/50",
              )}
            >
              {score} · {text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The end-of-experiment questions (spec §41). */
export function ExperimentReviewForm({ experimentId, topic }: { experimentId: string; topic: string }) {
  const [enjoyment, setEnjoyment] = useState<number | null>(null);
  const [interest, setInterest] = useState<number | null>(null);
  const [improvement, setImprovement] = useState<ExperimentImprovement | null>(null);
  const [decision, setDecision] = useState<ExperimentDecision | null>(null);
  const [learned, setLearned] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const complete = enjoyment !== null && interest !== null && improvement !== null && decision !== null && learned.trim().length >= 3;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setResult(await reviewExperimentAction({ experimentId, enjoyment, interest, improvement, decision, learned }));
        });
      }}
    >
      <Scale name="enjoyment" label="Did you enjoy it?" value={enjoyment} onChange={setEnjoyment} />
      <Scale name="interest" label="Were you interested?" value={interest} onChange={setInterest} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Did you improve?</legend>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          {(Object.keys(IMPROVEMENT_LABEL) as ExperimentImprovement[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={improvement === key}
              onClick={() => setImprovement(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                improvement === key ? "border-primary bg-primary/12 font-medium text-primary" : "hover:border-primary/50",
              )}
            >
              {IMPROVEMENT_LABEL[key]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="experiment-learned">What did you learn?</Label>
        <Textarea
          id="experiment-learned"
          rows={4}
          maxLength={1500}
          value={learned}
          onChange={(event) => setLearned(event.target.value)}
          placeholder={`About ${topic} — and about yourself.`}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Do you want to continue?</legend>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(DECISION_META) as ExperimentDecision[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={decision === key}
              onClick={() => setDecision(key)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                decision === key ? "border-primary bg-primary/10" : "hover:border-primary/50",
              )}
            >
              <span className="text-sm font-medium">{DECISION_META[key].label}</span>
              <span className="text-xs text-muted-foreground">{DECISION_META[key].detail}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-emerald-600 dark:text-emerald-300" : "text-sm text-destructive"}>
          {result.ok ? result.message : result.error}
        </p>
      )}

      <Button type="submit" disabled={pending || !complete}>
        {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
        {decision === "MAKE_IT_A_GOAL" ? "Save and create the goal" : "Save review"}
      </Button>
    </form>
  );
}
