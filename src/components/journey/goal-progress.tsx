import { CheckIcon, FlagIcon, StarIcon, TargetIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MilestoneNode } from "@/modules/journey/character";
import type { GoalJourney } from "@/server/services/journey.service";

import { Meter } from "./hud";

/**
 * A goal's roadmap as a path: start, each milestone in order, and the goal
 * itself as the destination. Done nodes are lit, the current one pulses
 * with a ring, the rest wait. Skipped milestones stay visible, struck through.
 */
export function MilestonePath({ milestones, goalDone }: { milestones: MilestoneNode[]; goalDone: boolean }) {
  return (
    <ol className="relative space-y-0.5">
      <li className="flex items-center gap-3 pb-1 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        <span className="grid w-5 place-items-center">
          <FlagIcon className="size-3.5" aria-hidden />
        </span>
        Start
      </li>
      {milestones.map((node) => (
        <li key={node.id} className="relative flex items-center gap-3 py-1.5">
          <span aria-hidden className={cn("absolute top-[-0.6rem] bottom-1/2 left-[0.6rem] w-px", node.state === "done" ? "bg-success" : "bg-border")} />
          <span
            className={cn(
              "relative z-10 grid size-5 shrink-0 place-items-center rounded-full",
              node.state === "done" && "glow-success bg-success text-success-foreground",
              node.state === "current" && "border-2 border-success bg-card",
              node.state === "upcoming" && "border border-border bg-card",
              node.state === "skipped" && "border border-dashed border-border bg-card",
            )}
          >
            {node.state === "done" && <CheckIcon className="size-3" strokeWidth={3} aria-hidden />}
            {node.state === "current" && <span className="size-1.5 rounded-full bg-success" aria-hidden />}
          </span>
          <span className={cn("text-sm", node.state === "upcoming" && "text-muted-foreground", node.state === "skipped" && "text-muted-foreground line-through")}>
            {node.title}
          </span>
          <span className="sr-only">
            {node.state === "done" ? "done" : node.state === "current" ? "in progress" : node.state === "skipped" ? "skipped" : "ahead"}
          </span>
          {node.state === "current" && <span className="ml-auto font-mono text-[10px] tracking-[0.18em] text-success uppercase">Now</span>}
        </li>
      ))}
      <li className="relative flex items-center gap-3 pt-1.5">
        <span aria-hidden className={cn("absolute top-[-0.6rem] bottom-1/2 left-[0.6rem] w-px", goalDone ? "bg-success" : "bg-border")} />
        <span className={cn("relative z-10 grid size-5 place-items-center rounded-full", goalDone ? "bg-success text-success-foreground" : "border bg-card text-muted-foreground")}>
          <StarIcon className="size-3" aria-hidden />
        </span>
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Goal reached</span>
      </li>
    </ol>
  );
}

function GoalCard({ goal, open }: { goal: GoalJourney; open: boolean }) {
  return (
    <li className="rounded-xl border bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/goals/${goal.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">
          <span aria-hidden>{goal.emoji}</span> {goal.title}
        </Link>
        <div className="flex items-center gap-1.5">
          {goal.isMajor && <Badge variant="secondary">Major goal</Badge>}
          {goal.status === "PAUSED" && <Badge variant="outline">Paused</Badge>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Meter percent={goal.percent} label={`${goal.title} progress`} className="flex-1" />
        <span className="w-12 text-right text-lg font-semibold tabular-nums">{goal.percent}%</span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
        {goal.totalMissions > 0 ? `${goal.completedMissions} of ${goal.totalMissions} missions` : "No missions mapped yet"} ·{" "}
        {goal.milestones.filter((node) => node.state === "done").length} of {goal.milestones.filter((node) => node.state !== "skipped").length} milestones
      </p>
      {goal.milestones.length > 0 && (
        <details open={open} className="group mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Milestone path</summary>
          <div className="mt-3">
            <MilestonePath milestones={goal.milestones} goalDone={goal.percent >= 100} />
          </div>
        </details>
      )}
    </li>
  );
}

/** Every active goal with its roadmap; the major goal opens with its path showing. */
export function GoalProgress({ goals }: { goals: GoalJourney[] }) {
  if (goals.length === 0) {
    return (
      <EmptyState
        icon={TargetIcon}
        title="No active goals"
        description="A goal turns into a milestone path here — each step lights up as you finish it."
        action={
          <Link href="/goals/new" className={buttonVariants({ size: "sm" })}>
            Create a goal
          </Link>
        }
      />
    );
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {goals.map((goal, index) => (
        <GoalCard key={goal.id} goal={goal} open={goal.isMajor || (index === 0 && !goals.some((entry) => entry.isMajor))} />
      ))}
    </ul>
  );
}
