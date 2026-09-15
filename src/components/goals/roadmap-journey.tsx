import { CheckIcon, FlagIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GoalDetail } from "@/server/services/goal-view.service";

/**
 * The big picture at a glance: goal → milestones → finish line. Scrolls
 * horizontally on small screens instead of squashing the stages.
 */
export function RoadmapJourney({ goal }: { goal: GoalDetail }) {
  if (goal.roadmap.length === 0) return null;
  const currentIndex = goal.roadmap.findIndex((m) => m.status !== "COMPLETED" && m.status !== "SKIPPED");

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <ol className="flex min-w-max items-stretch gap-2" aria-label="Roadmap overview">
        {goal.roadmap.map((milestone, index) => {
          const completed = milestone.missions.filter((m) => m.status === "COMPLETED").length;
          const countable = milestone.missions.filter((m) => m.status !== "SKIPPED").length;
          const percent = countable > 0 ? Math.round((completed / countable) * 100) : milestone.status === "COMPLETED" ? 100 : 0;
          const isCurrent = index === currentIndex;
          return (
            <li key={milestone.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-40 rounded-lg border px-3 py-2",
                  milestone.status === "COMPLETED" && "border-primary/40 bg-primary/10",
                  isCurrent && "border-primary/60",
                  milestone.status === "SKIPPED" && "border-dashed opacity-60",
                )}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {milestone.status === "COMPLETED" ? <CheckIcon className="size-3 text-primary" aria-hidden /> : `Stage ${index + 1}`}
                  {isCurrent && <span className="text-primary">· Now</span>}
                </p>
                <p className="truncate text-sm font-medium" title={milestone.title}>
                  {milestone.title}
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <span aria-hidden className="h-px w-3 bg-border" />
            </li>
          );
        })}
        <li
          className={cn(
            "flex w-40 flex-col justify-center rounded-lg border border-dashed px-3 py-2",
            goal.status === "COMPLETED" && "border-solid border-emerald-500/50 bg-emerald-500/10",
          )}
        >
          <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            <FlagIcon className="size-3" aria-hidden />
            Goal
          </p>
          <p className="truncate text-sm font-medium" title={goal.target ?? goal.title}>
            {goal.target ?? goal.title}
          </p>
        </li>
      </ol>
    </div>
  );
}
