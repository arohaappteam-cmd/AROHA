import { CalendarClockIcon, ChevronRightIcon, FlagIcon } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { deadlineState, describeDeadline } from "@/modules/goals/dates";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import type { GoalCard as GoalCardData } from "@/server/services/goal-view.service";

import { GoalStatusBadge, MajorGoalBadge, ProgressBar } from "./goal-badges";

export function GoalCard({ goal, today }: { goal: GoalCardData; today: string }) {
  const area = LIFE_AREAS[goal.lifeArea];
  const deadline = describeDeadline(goal.deadline, today);
  const overdue = deadlineState(goal.deadline, today).kind === "overdue" && goal.status !== "COMPLETED";

  return (
    <Card className={cn("group relative p-0 transition-colors hover:ring-primary/40", goal.isMajor && "ring-xp/40")}>
      <Link href={`/goals/${goal.id}`} className="flex flex-col gap-4 p-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-2xl" aria-hidden>
            {area.emoji}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {goal.isMajor && <MajorGoalBadge />}
              <GoalStatusBadge status={goal.status} archived={goal.archived} />
              <span className="text-xs text-muted-foreground">{area.label}</span>
            </div>
            <h3 className="text-lg leading-snug font-semibold text-balance">{goal.title}</h3>
            {goal.target && (
              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <FlagIcon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{goal.target}</span>
              </p>
            )}
          </div>
          <ChevronRightIcon className="mt-1 size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>

        {goal.milestones.length > 0 && (
          <ol className="flex gap-1" aria-label="Milestones">
            {goal.milestones.map((milestone) => (
              <li
                key={milestone.id}
                title={`${milestone.title} — ${milestone.status.toLowerCase().replace("_", " ")}`}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  milestone.status === "COMPLETED" && "bg-primary",
                  milestone.status === "IN_PROGRESS" && "bg-primary/45",
                  milestone.status === "SKIPPED" && "bg-muted-foreground/25",
                  milestone.status === "PENDING" && "bg-muted",
                )}
              />
            ))}
          </ol>
        )}

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              {goal.progress.totalMissions > 0
                ? `${goal.progress.completedMissions} of ${goal.progress.totalMissions - goal.progress.skippedMissions} missions`
                : goal.milestones.length > 0
                  ? `${goal.progress.completedMilestones} of ${goal.milestones.length} milestones`
                  : "No roadmap yet"}
            </span>
            <span className="font-medium tabular-nums">{goal.percent}%</span>
          </div>
          {goal.milestones.length === 0 && (
            <ProgressBar percent={goal.percent} label={`${goal.title} progress`} tone={goal.status === "COMPLETED" ? "success" : "primary"} />
          )}
        </div>

        {(goal.next || deadline) && (
          <div className="flex flex-col gap-1.5 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            {goal.next ? (
              <p className="min-w-0 truncate">
                <span className="text-muted-foreground">Next: </span>
                {goal.next.mission?.title ?? goal.next.milestone.title}
              </p>
            ) : (
              <span />
            )}
            {deadline && (
              <p className={cn("flex shrink-0 items-center gap-1.5 text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                <CalendarClockIcon className="size-3.5" aria-hidden />
                {deadline}
              </p>
            )}
          </div>
        )}
      </Link>
    </Card>
  );
}
