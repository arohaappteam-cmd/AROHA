"use client";

import { LoaderCircleIcon, PlayIcon } from "lucide-react";
import { useState } from "react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { startChallengeAction } from "@/server/actions/challenge.actions";
import type { ChallengeTemplateView } from "@/server/services/challenge.service";

/**
 * The challenge templates that can be started. Deliberately capped at two
 * running at once: commitments you can keep beat commitments you can count.
 */
export function StartChallenges({ templates, canStart }: { templates: ChallengeTemplateView[]; canStart: boolean }) {
  const { pending, error, run } = useActionRunner();
  const [startingKey, setStartingKey] = useState<string | null>(null);

  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      {!canStart && (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Two challenges are already running — that&apos;s the limit, on purpose. Finish or set one down to start another.
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => (
          <li key={template.key} className="flex flex-col gap-2 rounded-xl border border-dashed p-4">
            <p className="flex items-center gap-2 font-medium">
              <span className="text-xl" aria-hidden>
                {template.emoji}
              </span>
              {template.title}
            </p>
            <p className="flex-1 text-sm text-muted-foreground">{template.description}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground tabular-nums">
                {template.targetDays} of {template.durationDays} days · +{template.xpReward} XP
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={!canStart || pending}
                onClick={() => {
                  setStartingKey(template.key);
                  run(() => startChallengeAction(template.key));
                }}
              >
                {pending && startingKey === template.key ? (
                  <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <PlayIcon data-icon="inline-start" />
                )}
                Start
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
