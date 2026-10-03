"use client";

import { CheckIcon, FlagIcon, LoaderCircleIcon } from "lucide-react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { displayDateOnly } from "@/modules/goals/dates";
import { abandonChallengeAction } from "@/server/actions/challenge.actions";
import type { ChallengeView } from "@/server/services/challenge.service";
import { Glyph } from "@/components/common/glyph";

const STATUS_LABEL: Record<Exclude<ChallengeView["status"], "ACTIVE">, string> = {
  COMPLETED: "Completed",
  ENDED: "Window closed",
  ABANDONED: "Set down",
};

/** One challenge — running or part of the record. Days earned always show. */
export function ChallengeCard({ challenge }: { challenge: ChallengeView }) {
  const { pending, error, run } = useActionRunner();
  const { progress } = challenge;
  const active = challenge.status === "ACTIVE";

  return (
    <div className={cn("space-y-3 rounded-xl border bg-card p-4", !active && "opacity-90")}>
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          <Glyph emoji={challenge.emoji} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 font-medium">
            {challenge.title}
            {active ? (
              challenge.earnedToday ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-px text-xs font-medium text-emerald-600 dark:text-emerald-300">
                  <CheckIcon className="size-3" aria-hidden />
                  Today earned
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/12 px-2 py-px text-xs font-medium text-amber-600 dark:text-amber-300">
                  Today still open
                </span>
              )
            ) : (
              <span
                className={cn(
                  "rounded-full px-2 py-px text-xs font-medium",
                  challenge.status === "COMPLETED" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground",
                )}
              >
                {STATUS_LABEL[challenge.status as keyof typeof STATUS_LABEL]}
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">{challenge.description}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium tabular-nums">
            {progress.daysDone} of {progress.targetDays} days
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {active
              ? `${progress.daysLeft} window day${progress.daysLeft === 1 ? "" : "s"} left`
              : challenge.status === "COMPLETED"
                ? `Finished ${challenge.completedAt ? displayDateOnly(challenge.completedAt.toISOString().slice(0, 10)) : ""}`
                : `${progress.daysDone} real day${progress.daysDone === 1 ? "" : "s"} — still yours`}
          </span>
        </div>
        <Progress value={progress.percent} aria-label={`${challenge.title} progress`} className="gap-0">
          <ProgressTrack className="h-1.5">
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
        {active && !progress.stillPossible && (
          <p className="text-xs text-muted-foreground">
            The full target is out of reach this window — every day you still earn counts, and the challenge can always be run again.
          </p>
        )}
      </div>

      {active && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => abandonChallengeAction(challenge.id))}
            className="text-muted-foreground"
          >
            {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <FlagIcon data-icon="inline-start" />}
            Set it down
          </Button>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
