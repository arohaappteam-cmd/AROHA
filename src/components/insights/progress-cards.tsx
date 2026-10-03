import { FlameIcon, GitBranchIcon, TargetIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { displayDay } from "@/modules/analytics/dataset";
import type { AnalyticsOverview, Momentum } from "@/modules/analytics/overview";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { Glyph } from "@/components/common/glyph";

const MOMENTUM: Record<Momentum, { label: string; className: string; hint: string }> = {
  moving: { label: "Moving", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", hint: "Progress in 2+ of the last 4 weeks" },
  new: { label: "Just started", className: "bg-sky-500/12 text-sky-700 dark:text-sky-300", hint: "Set in the last 2 weeks" },
  slow: { label: "Slow", className: "bg-muted text-muted-foreground", hint: "Progress in 1 of the last 4 weeks" },
  stalled: { label: "Stalled", className: "bg-amber-500/12 text-amber-700 dark:text-amber-300", hint: "No progress in the last 4 weeks" },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground", hint: "Paused by you" },
};

export function GoalProgressCard({ overview }: { overview: AnalyticsOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TargetIcon className="size-4 text-primary" aria-hidden />
          Goal progress
        </CardTitle>
        <CardDescription>How far each roadmap has come, and whether it&apos;s been moving lately.</CardDescription>
      </CardHeader>
      <CardContent>
        {overview.goals.length === 0 ? (
          <EmptyState
            icon={TargetIcon}
            title="No active goals"
            description="Goal progress is one of the clearest trends to follow."
            action={
              <Link href="/goals/new" className={buttonVariants({ size: "sm" })}>
                Create a goal
              </Link>
            }
          />
        ) : (
          <ul className="divide-y">
            {overview.goals.map((goal) => {
              const momentum = MOMENTUM[goal.momentum];
              return (
                <li key={goal.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/goals/${goal.id}`} className="min-w-0 truncate text-sm font-medium underline-offset-4 hover:underline">
                      <span aria-hidden><Glyph emoji={LIFE_AREAS[goal.lifeArea].emoji} /></span> {goal.title}
                    </Link>
                    <div className="flex items-center gap-1.5">
                      {goal.isMajor && <Badge variant="outline">Major goal</Badge>}
                      <Badge className={momentum.className} title={momentum.hint}>
                        {momentum.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-success/15" role="img" aria-label={`${goal.percent}% of the roadmap done`}>
                      <div className="h-full rounded-full bg-success" style={{ width: `${goal.percent}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-medium tabular-nums">{goal.percent}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {goal.totalMissions > 0 ? `${goal.completedMissions} of ${goal.totalMissions} missions` : "No missions mapped yet"}
                    {" · "}
                    {goal.lastActivity ? `last progress ${displayDay(goal.lastActivity)}` : "no progress recorded yet"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function SkillProgressCard({ overview }: { overview: AnalyticsOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranchIcon className="size-4 text-primary" aria-hidden />
          Skill progression
        </CardTitle>
        <CardDescription>The skills you practised most over {overview.range.label}.</CardDescription>
      </CardHeader>
      <CardContent>
        {overview.skills.length === 0 ? (
          <EmptyState icon={GitBranchIcon} title="No skill practice in this period" description="Completed quests, lessons and projects train skills — they'll show up here." />
        ) : (
          <ul className="space-y-3">
            {overview.skills.map((skill) => {
              const gained = skill.levelTo - skill.levelFrom;
              return (
                <li key={skill.skillId} className="flex items-center gap-3">
                  <span aria-hidden className="text-lg">
                    {skill.treeEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{skill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {skill.treeName} · +{skill.xp} skill XP
                    </p>
                  </div>
                  <p className="text-right text-xs">
                    <span className="font-medium tabular-nums">
                      Lv {skill.levelFrom} → {skill.levelTo}
                    </span>
                    <span className={cn("block", gained > 0 ? "text-success" : "text-muted-foreground")}>
                      {gained > 0 ? `+${gained} level${gained === 1 ? "" : "s"}` : `of ${skill.maxLevel}`}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ChallengeProgressCard({ overview }: { overview: AnalyticsOverview }) {
  const { challenges } = overview;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlameIcon className="size-4 text-primary" aria-hidden />
          Challenges
        </CardTitle>
        <CardDescription>
          {challenges.completed === 0 && challenges.closedEarly === 0
            ? `None finished or closed over ${overview.range.label}.`
            : `Over ${overview.range.label}: ${challenges.completed} completed, ${challenges.closedEarly} set down or ran out.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {challenges.active.length === 0 ? (
          <EmptyState
            icon={FlameIcon}
            title="No challenge running"
            action={
              <Link href="/journey/challenges" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Browse challenges
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {challenges.active.map((challenge) => {
              const percent = Math.min(100, Math.round((challenge.daysCredited / challenge.targetDays) * 100));
              return (
                <li key={challenge.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">
                      <span aria-hidden><Glyph emoji={challenge.emoji} /></span> {challenge.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {challenge.daysCredited} / {challenge.targetDays} days
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-success/15">
                    <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
