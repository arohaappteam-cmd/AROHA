"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { MIN_RESPONSE_LENGTH } from "@/modules/assessments/grading";
import { RUBRIC_SCALE, type RubricCriterion } from "@/modules/assessments/types";
import { submitPracticalAction, submitProjectAssessmentAction } from "@/server/actions/assessment.actions";

type Project = { id: string; title: string; evidenceCount: number };

/**
 * Practical task and project review submissions. The user rates their own
 * work on each criterion; with AI configured those ratings are context for
 * an independent review, otherwise they are recorded as a labelled self-review.
 */
export function RubricForm({
  kind,
  assessmentKey,
  criteria,
  deliverable,
  projects = [],
  aiAvailable,
}: {
  kind: "PRACTICAL" | "PROJECT";
  assessmentKey: string;
  criteria: readonly RubricCriterion[];
  deliverable?: string;
  projects?: Project[];
  aiAvailable: boolean;
}) {
  const [response, setResponse] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldError = (field: string) => (result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined);
  const rated = criteria.filter((criterion) => ratings[criterion.key] !== undefined).length;

  if (kind === "PROJECT" && projects.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        A project review needs a completed project that used this skill and has evidence attached. Finish one in Projects, then come
        back.
      </p>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const next =
            kind === "PRACTICAL"
              ? await submitPracticalAction({ assessmentKey, response, evidenceUrl, ratings })
              : await submitProjectAssessmentAction({ assessmentKey, projectId, response, ratings });
          setResult(next);
        });
      }}
    >
      {kind === "PROJECT" ? (
        <div className="space-y-2">
          <Label htmlFor="project">Which project shows it?</Label>
          <select
            id="project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title} · {project.evidenceCount} evidence
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">The project&apos;s evidence is included in the review.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="evidence">Link to your work</Label>
          <Input
            id="evidence"
            type="url"
            maxLength={500}
            value={evidenceUrl}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://…"
            aria-invalid={Boolean(fieldError("evidenceUrl"))}
          />
          {deliverable && <p className="text-xs text-muted-foreground">Hand in: {deliverable}</p>}
          {fieldError("evidenceUrl") && <p className="text-xs text-destructive">{fieldError("evidenceUrl")}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="response">{kind === "PROJECT" ? "Walk through the project" : "What you did, and how"}</Label>
        <Textarea
          id="response"
          rows={6}
          maxLength={3000}
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          placeholder={
            kind === "PROJECT"
              ? "What you made, how this skill was used in it, what was hard, and what you'd do differently."
              : "Describe what you made, the choices you took, and anything that went wrong along the way."
          }
          aria-invalid={Boolean(fieldError("response"))}
        />
        <p className={cn("text-xs tabular-nums", response.trim().length < MIN_RESPONSE_LENGTH ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-300")}>
          {response.trim().length} / {MIN_RESPONSE_LENGTH} characters minimum
        </p>
        {fieldError("response") && <p className="text-xs text-destructive">{fieldError("response")}</p>}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Rate your own work honestly</legend>
        <p className="text-xs text-muted-foreground">
          {aiAvailable
            ? "The AI reviewer scores independently — your ratings are context, not the result."
            : "AI review isn't set up, so these ratings are the evaluation. The result will be labelled “Self-reviewed” and your evidence stays attached for anyone to check."}
        </p>
        {criteria.map((criterion) => (
          <div key={criterion.key} className="space-y-2 rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">
                {criterion.label}
                {criterion.weight > 1 && <span className="ml-2 text-xs font-normal text-muted-foreground">×{criterion.weight} weight</span>}
              </p>
              <p className="text-xs text-muted-foreground">{criterion.description}</p>
            </div>
            <div role="radiogroup" aria-label={criterion.label} className="flex flex-wrap gap-1.5">
              {RUBRIC_SCALE.map((step) => {
                const active = ratings[criterion.key] === step.value;
                return (
                  <button
                    key={step.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRatings((current) => ({ ...current, [criterion.key]: step.value }))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      active ? "border-primary bg-primary/15 font-medium text-primary" : "hover:border-primary/50",
                    )}
                  >
                    {step.value} · {step.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      {result && !result.ok && !fieldError("response") && !fieldError("evidenceUrl") && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || rated < criteria.length}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          {aiAvailable ? "Submit for review" : "Submit"}
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {rated} of {criteria.length} criteria rated
        </span>
      </div>
    </form>
  );
}
