"use client";

import { FlaskConicalIcon, LoaderCircleIcon, PlayIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LifeArea } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import type { ExperimentTemplate } from "@/modules/experiments/catalogue";
import { EXPERIMENT_DURATION } from "@/modules/experiments/logic";
import { LIFE_AREA_LIST } from "@/modules/identity/life-areas";
import { startCustomExperimentAction, startTemplateExperimentAction } from "@/server/actions/experiment.actions";

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="text-sm text-emerald-600 dark:text-emerald-300">
      {result.message}
    </p>
  ) : (
    <p role="alert" className="text-sm text-destructive">
      {result.error}
    </p>
  );
}

export function ExperimentTemplates({ templates, canStart }: { templates: readonly ExperimentTemplate[]; canStart: boolean }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {!canStart && (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Two experiments are running — that&apos;s the limit, so each one gets a fair try. Wrap one up to start another.
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <li key={template.key} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-medium">
              <span className="text-2xl" aria-hidden>
                {template.emoji}
              </span>
              {template.title}
            </p>
            <p className="flex-1 text-sm text-muted-foreground">{template.description}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {template.durationDays} days · {template.dailyMinutes} min/day
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!canStart || pending}
                onClick={() => {
                  setStartingKey(template.key);
                  startTransition(async () => setResult(await startTemplateExperimentAction({ templateKey: template.key })));
                }}
              >
                {pending && startingKey === template.key ? (
                  <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <PlayIcon data-icon="inline-start" />
                )}
                Try it
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Feedback result={result} />
    </div>
  );
}

export function CustomExperimentForm({ canStart }: { canStart: boolean }) {
  const [values, setValues] = useState<{ topic: string; durationDays: string; dailyMinutes: string; lifeArea: LifeArea }>({
    topic: "",
    durationDays: "7",
    dailyMinutes: "20",
    lifeArea: "EXPERIENCES",
  });
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldError = (field: string) => (result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined);

  return (
    <form
      className="space-y-4 rounded-2xl border border-dashed p-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const next = await startCustomExperimentAction(values);
          setResult(next);
          if (next.ok) setValues((current) => ({ ...current, topic: "" }));
        });
      }}
    >
      <p className="flex items-center gap-2 font-medium">
        <FlaskConicalIcon className="size-5 text-primary" aria-hidden />
        Try something of your own
      </p>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem_7rem]">
        <div className="space-y-1.5">
          <Label htmlFor="experiment-topic">I want to try…</Label>
          <Input
            id="experiment-topic"
            maxLength={60}
            value={values.topic}
            onChange={(event) => setValues((current) => ({ ...current, topic: event.target.value }))}
            placeholder="pottery, chess, cold showers, Spanish"
          />
          {fieldError("topic") && <p className="text-xs text-destructive">{fieldError("topic")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="experiment-days">For (days)</Label>
          <Input
            id="experiment-days"
            type="number"
            min={EXPERIMENT_DURATION.min}
            max={EXPERIMENT_DURATION.max}
            value={values.durationDays}
            onChange={(event) => setValues((current) => ({ ...current, durationDays: event.target.value }))}
          />
          {fieldError("durationDays") && <p className="text-xs text-destructive">{fieldError("durationDays")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="experiment-minutes">Min / day</Label>
          <Input
            id="experiment-minutes"
            type="number"
            min={5}
            max={120}
            value={values.dailyMinutes}
            onChange={(event) => setValues((current) => ({ ...current, dailyMinutes: event.target.value }))}
          />
          {fieldError("dailyMinutes") && <p className="text-xs text-destructive">{fieldError("dailyMinutes")}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="experiment-area">Part of life</Label>
        <select
          id="experiment-area"
          value={values.lifeArea}
          onChange={(event) => setValues((current) => ({ ...current, lifeArea: event.target.value as LifeArea }))}
          className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm sm:w-72"
        >
          {LIFE_AREA_LIST.map((area) => (
            <option key={area.key} value={area.key}>
              {area.emoji} {area.label}
            </option>
          ))}
        </select>
      </div>
      <Feedback result={fieldError("topic") ? null : result} />
      <Button type="submit" disabled={!canStart || pending}>
        {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
        Start experiment
      </Button>
    </form>
  );
}
