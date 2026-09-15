import {
  ArrowLeftIcon,
  CalendarClockIcon,
  FlagIcon,
  HeartIcon,
  InfoIcon,
  MapIcon,
  SparklesIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GoalActions } from "@/components/goals/goal-actions";
import { GoalStatusBadge, MajorGoalBadge, ProgressBar } from "@/components/goals/goal-badges";
import { RoadmapEditor } from "@/components/goals/roadmap-editor";
import { RoadmapJourney } from "@/components/goals/roadmap-journey";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { deadlineState, describeDeadline, displayDateOnly } from "@/modules/goals/dates";
import { STARTING_POINT_OPTIONS } from "@/modules/goals/status";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { getGoalDetail } from "@/server/services/goal-view.service";

export async function generateMetadata(props: PageProps<"/goals/[goalId]">): Promise<Metadata> {
  const { goalId } = await props.params;
  const goal = await getGoalDetail(goalId);
  return { title: goal?.title ?? "Goal" };
}

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

export default async function GoalPage(props: PageProps<"/goals/[goalId]">) {
  const { goalId } = await props.params;
  const goal = await getGoalDetail(goalId);
  if (!goal) notFound();

  const area = LIFE_AREAS[goal.lifeArea];
  const deadlineText = describeDeadline(goal.deadline, goal.today);
  const overdue = deadlineState(goal.deadline, goal.today).kind === "overdue" && goal.status !== "COMPLETED";
  const remainingMissions = goal.progress.totalMissions - goal.progress.completedMissions - goal.progress.skippedMissions;
  const startingPoint = STARTING_POINT_OPTIONS.find((o) => o.key === goal.startingPoint)?.label;

  return (
    <div className="space-y-6">
      <Link href="/goals" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        Goals
      </Link>

      {goal.archived && (
        <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <InfoIcon className="size-4 shrink-0" aria-hidden />
          This goal is archived and read-only. Restore it to make changes.
        </p>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-3xl" aria-hidden>
            {area.emoji}
          </span>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {goal.isMajor && <MajorGoalBadge />}
              <GoalStatusBadge status={goal.status} archived={goal.archived} />
              <span className="text-xs text-muted-foreground">{area.label}</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{goal.title}</h1>
            <p className="text-xs text-muted-foreground">
              Started {dateFormat.format(goal.createdAt)}
              {goal.completedAt && ` · Completed ${dateFormat.format(goal.completedAt)}`}
              {goal.status === "PAUSED" && goal.pausedAt && ` · Paused ${dateFormat.format(goal.pausedAt)}`}
            </p>
          </div>
        </div>
        <GoalActions
          goal={{
            id: goal.id,
            title: goal.title,
            status: goal.status,
            archived: goal.archived,
            isMajor: goal.isMajor,
            remainingMissions,
          }}
        />
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm" className="md:col-span-2">
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <HeartIcon className="size-3.5" aria-hidden />
                  Why it matters
                </p>
                <p className="text-sm text-pretty">
                  {goal.motivation ?? <span className="text-muted-foreground">Not written yet.</span>}
                </p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <FlagIcon className="size-3.5" aria-hidden />
                  Success looks like
                </p>
                <p className="text-sm text-pretty">
                  {goal.target ?? <span className="text-muted-foreground">Not defined yet.</span>}
                </p>
              </div>
            </div>
            {goal.description && <p className="border-t pt-3 text-sm whitespace-pre-line text-muted-foreground">{goal.description}</p>}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Progress</p>
              <p className="text-2xl font-semibold tabular-nums">{goal.percent}%</p>
            </div>
            <ProgressBar percent={goal.percent} label="Goal progress" tone={goal.status === "COMPLETED" ? "success" : "primary"} />
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Milestones</dt>
                <dd className="tabular-nums">
                  {goal.progress.completedMilestones}/{goal.progress.totalMilestones}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Missions</dt>
                <dd className="tabular-nums">
                  {goal.progress.completedMissions}/{goal.progress.totalMissions - goal.progress.skippedMissions}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Deadline</dt>
                <dd className={cn("text-right", overdue && "text-destructive")}>
                  {goal.deadline ? (
                    <span title={displayDateOnly(goal.deadline)} className="flex items-center gap-1">
                      <CalendarClockIcon className="size-3.5" aria-hidden />
                      {deadlineText}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Starting point</dt>
                <dd>{startingPoint}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {goal.status !== "COMPLETED" && !goal.archived && goal.progress.roadmapDone && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          Every step on your roadmap is done. If you&apos;ve reached what mattered, mark this goal complete.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapIcon className="size-5 text-primary" aria-hidden />
            Roadmap
          </CardTitle>
          <CardDescription>
            {goal.next
              ? <>Next step: <span className="text-foreground">{goal.next.mission?.title ?? goal.next.milestone.title}</span></>
              : "Goal → milestones → missions. Each mission is something you can finish."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <RoadmapJourney goal={goal} />
          {goal.lastRevision?.summary && goal.roadmap.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <SparklesIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                {goal.lastRevision.summary}
                {goal.lastRevision.source === "TEMPLATE" && " The AI Mentor will be able to personalise this further."}
              </span>
            </p>
          )}
          <RoadmapEditor goalId={goal.id} roadmap={goal.roadmap} readOnly={goal.archived} />
        </CardContent>
      </Card>
    </div>
  );
}
