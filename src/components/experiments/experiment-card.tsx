import { CheckIcon } from "lucide-react";
import Link from "next/link";

import { categoryStyle } from "@/components/quests/category-style";
import { cn } from "@/lib/utils";
import { DECISION_META } from "@/modules/experiments/logic";
import type { ExperimentView } from "@/server/services/experiment.service";
import { Glyph } from "@/components/common/glyph";

/** Practice days as a row of dots: filled for days actually tried. */
export function PracticeDots({ experiment }: { experiment: ExperimentView }) {
  const style = categoryStyle(experiment.lifeArea);
  const practiced = experiment.progress.daysPracticed;
  return (
    <div className="flex flex-wrap gap-1" aria-label={`${practiced} of ${experiment.durationDays} days practised`}>
      {Array.from({ length: experiment.durationDays }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            "size-2.5 rounded-full",
            index < practiced ? style.solid : "bg-muted",
            experiment.progress.dayNumber === index + 1 && index >= practiced && "ring-2 ring-primary/40",
          )}
        />
      ))}
    </div>
  );
}

export function ExperimentCard({ experiment }: { experiment: ExperimentView }) {
  const { progress, status } = experiment;

  return (
    <Link
      href={`/discover/${experiment.id}`}
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50",
        status === "REVIEW_DUE" && "border-amber-500/50",
        (status === "REVIEWED" || status === "ABANDONED") && "opacity-90",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          <Glyph emoji={experiment.emoji} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{experiment.title}</p>
          <p className="text-xs text-muted-foreground">
            {status === "ACTIVE" && progress.dayNumber !== null && `Day ${progress.dayNumber} of ${experiment.durationDays} · ${experiment.dailyMinutes} min a day`}
            {status === "REVIEW_DUE" && "Finished — how did it go?"}
            {status === "REVIEWED" && experiment.review.decision && DECISION_META[experiment.review.decision].label}
            {status === "ABANDONED" && "Set down"}
          </p>
        </div>
        {status === "ACTIVE" && experiment.practicedToday && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
            <CheckIcon className="size-3" aria-hidden />
            Today
          </span>
        )}
        {status === "REVIEW_DUE" && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-300">Review</span>
        )}
      </div>
      <PracticeDots experiment={experiment} />
      <p className="text-xs text-muted-foreground tabular-nums">
        {progress.daysPracticed} day{progress.daysPracticed === 1 ? "" : "s"} practised
        {status === "ACTIVE" && ` · ${progress.daysLeft} left`}
        {status === "REVIEWED" && experiment.review.enjoyment !== null && ` · enjoyed it ${experiment.review.enjoyment}/5`}
      </p>
    </Link>
  );
}
