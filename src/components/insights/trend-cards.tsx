import { CircleDashedIcon, MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LifeArea } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import type { AnalyticsOverview, Direction } from "@/modules/analytics/overview";

import { ColumnChart, MiniColumns } from "./column-chart";

const numberFormat = new Intl.NumberFormat("en");

/**
 * Chart fills for the five core areas plus "Other" — the 600 steps, which
 * pass the colour-vision and contrast checks on both light and dark surfaces
 * in this order. Areas are always named beside their colour.
 */
const AREA_FILL: Partial<Record<LifeArea | "OTHER", string>> = {
  PHYSICAL: "bg-orange-600",
  MENTAL: "bg-sky-600",
  LEARNING: "bg-amber-600",
  SOCIAL: "bg-rose-600",
  PERSONAL_GOAL: "bg-violet-600",
};
const areaFill = (key: LifeArea | "OTHER") => AREA_FILL[key] ?? "bg-muted-foreground/45";

// ─── Totals ──────────────────────────────────────────────────────────────────

export function StatTotals({ overview }: { overview: AnalyticsOverview }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {overview.totals.map((total) => {
        const change = total.value - total.previous;
        return (
          <Card key={total.key} size="sm">
            <CardContent className="space-y-1">
              <dt className="text-xs text-muted-foreground">{total.label}</dt>
              <dd className="text-2xl font-semibold">{numberFormat.format(total.value)}</dd>
              <dd className="text-xs text-muted-foreground">
                {change === 0 ? (
                  <>Same as {overview.range.previousLabel}</>
                ) : (
                  <>
                    <span className={cn("font-medium", change > 0 && "text-emerald-600 dark:text-emerald-300")}>
                      {change > 0 ? "▲" : "▼"} {numberFormat.format(Math.abs(change))}
                    </span>{" "}
                    vs {overview.range.previousLabel}
                  </>
                )}
              </dd>
            </CardContent>
          </Card>
        );
      })}
    </dl>
  );
}

// ─── Life areas ──────────────────────────────────────────────────────────────

const DIRECTION: Record<Direction, { label: string; icon: typeof TrendingUpIcon }> = {
  up: { label: "Picking up", icon: TrendingUpIcon },
  down: { label: "Dipping", icon: TrendingDownIcon },
  steady: { label: "Steady", icon: MinusIcon },
  quiet: { label: "Quiet", icon: CircleDashedIcon },
};

export function LifeAreaCard({ overview }: { overview: AnalyticsOverview }) {
  const total = overview.balance.reduce((sum, slice) => sum + slice.completed, 0);
  const visible = overview.balance.filter((slice) => slice.completed > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Life areas</CardTitle>
        <CardDescription>
          Where your completed quests went over {overview.range.label}. Balance is a picture of your days, not a target — some
          seasons lean one way.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {total > 0 && (
          <div className="space-y-3">
            <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Balance: ${visible.map((slice) => `${slice.label} ${slice.percent}%`).join(", ")}`}>
              {visible.map((slice) => (
                <div key={slice.key} className={areaFill(slice.key)} style={{ width: `${(slice.completed / total) * 100}%` }} title={`${slice.label}: ${slice.completed} (${slice.percent}%)`} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {overview.balance.map((slice) => (
                <li key={slice.key} className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2.5 rounded-full", areaFill(slice.key))} />
                  <span>{slice.label}</span>
                  <span className="text-muted-foreground tabular-nums">{slice.percent}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="divide-y">
          {overview.areas.map((area) => {
            const direction = DIRECTION[area.direction];
            const Icon = direction.icon;
            return (
              <li key={area.lifeArea} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-4 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_7.5rem]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span aria-hidden>{area.emoji}</span> {area.label}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {area.completed} done{area.settled > 0 ? ` of ${area.settled}` : ""}
                  </p>
                </div>
                <MiniColumns
                  values={area.weekly}
                  barClassName={areaFill(AREA_FILL[area.lifeArea] ? area.lifeArea : "OTHER")}
                  label={`${area.label} quests completed per week: ${area.weekly.join(", ")}`}
                />
                <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground" title={`${area.recent} in the last 3 weeks, ${area.prior} the 3 weeks before`}>
                  <Icon className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">{direction.label}</span>
                  <span className="sr-only sm:hidden">{direction.label}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">Direction compares the last 3 weeks with the 3 weeks before.</p>
      </CardContent>
    </Card>
  );
}

// ─── Weekly charts ───────────────────────────────────────────────────────────

export function QuestTrendCard({ overview }: { overview: AnalyticsOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quests completed</CardTitle>
        <CardDescription>
          {overview.completionRate === null
            ? "Per week, once your first days are done."
            : `Per week. You finished ${overview.completionRate}% of the quests you were offered over ${overview.range.label}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ColumnChart
          title="Quests completed per week"
          unit="quests"
          points={overview.weeks.map((week) => ({
            label: week.label,
            value: week.completed,
            detail: week.settled > 0 ? `${week.completed} of ${week.settled} offered` : "No quests offered",
          }))}
        />
      </CardContent>
    </Card>
  );
}

export function XpTrendCard({ overview }: { overview: AnalyticsOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>XP earned</CardTitle>
        <CardDescription>
          Per week, from quests, goals, projects, challenges and more.{" "}
          <Link href="/character" className="underline-offset-4 hover:underline">
            See the ledger
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ColumnChart title="XP earned per week" unit="XP" barClassName="bg-xp" points={overview.weeks.map((week) => ({ label: week.label, value: week.xp }))} />
      </CardContent>
    </Card>
  );
}
