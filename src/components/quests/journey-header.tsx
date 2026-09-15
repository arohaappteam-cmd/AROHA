import { SparklesIcon } from "lucide-react";
import Link from "next/link";

import { CharacterAvatar } from "@/components/character/character-avatar";
import type { AvatarAppearance } from "@/modules/identity/avatar";
import { displayDateOnly } from "@/modules/goals/dates";
import { categoryFor } from "@/modules/quests/categories";
import type { TierTitle } from "@/modules/progression/levels";
import { cn } from "@/lib/utils";
import type { TodayJourney } from "@/server/services/quest-view.service";

import { categoryStyle } from "./category-style";
import { EnergyCheckIn } from "./energy-check-in";
import { ProgressRing } from "./quest-meta";

const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });

function headline(journey: TodayJourney): string {
  const { coreCompleted, coreTotal, coreResolved, inProgress } = journey.progress;
  if (coreCompleted === coreTotal) return "Journey complete. You showed up for every part of your life today.";
  if (coreResolved === coreTotal) return "Today's journey is settled. Rest well — tomorrow adapts.";
  if (inProgress > 0) return "A quest is underway. Go live it, then come back to record it.";
  if (coreCompleted === 0) return "Five small quests. One better day.";
  return `${coreTotal - coreResolved} quest${coreTotal - coreResolved === 1 ? "" : "s"} left on today's path.`;
}

export function JourneyHeader({
  journey,
  greeting,
  name,
  appearance,
  tier,
}: {
  journey: TodayJourney;
  greeting: string;
  name: string;
  appearance: AvatarAppearance;
  tier: TierTitle;
}) {
  const { progress } = journey;
  return (
    <section aria-labelledby="journey-title" className="relative overflow-hidden rounded-3xl border bg-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--primary)_28%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklch,var(--xp)_14%,transparent),transparent_50%)]"
      />
      <div className="relative space-y-6 p-5 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link href="/character" aria-label="Open your character" className="hidden shrink-0 rounded-full sm:block">
              <CharacterAvatar appearance={appearance} name={name} tier={tier} size={76} />
            </Link>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
                Today&apos;s journey · {weekday.format(new Date(`${journey.date}T00:00:00Z`))}, {displayDateOnly(journey.date)}
              </p>
              <h1 id="journey-title" className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                {greeting}, {name}
              </h1>
              <p className="text-sm text-pretty text-muted-foreground">{headline(journey)}</p>
            </div>
          </div>

          <div className="flex items-center gap-5 md:gap-6">
            <ProgressRing value={progress.coreCompleted} total={progress.coreTotal} label={`${progress.coreCompleted} of ${progress.coreTotal} quests complete`} />
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">XP on today&apos;s path</dt>
                <dd className="flex items-center gap-1 text-lg font-semibold text-xp tabular-nums">
                  <SparklesIcon className="size-4" aria-hidden />
                  {progress.completedXp}
                  <span className="text-sm font-normal text-muted-foreground">/ {progress.plannedXp}</span>
                </dd>
              </div>
              {!journey.xpAwarded && (
                <dd className="max-w-40 text-[11px] leading-snug text-muted-foreground">Recorded now, added to your character when progression launches.</dd>
              )}
            </dl>
          </div>
        </div>

        <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress by category">
          {journey.core.map((quest) => {
            const style = categoryStyle(quest.lifeArea);
            const category = categoryFor(quest.lifeArea);
            const done = quest.status === "COMPLETED";
            return (
              <li key={quest.id} className="space-y-1.5 text-center">
                <div
                  className={cn(
                    "h-1.5 rounded-full",
                    done ? "bg-emerald-500" : quest.status === "IN_PROGRESS" ? style.solid : quest.status === "PENDING" ? "bg-muted" : "bg-muted-foreground/25",
                  )}
                />
                <p className="truncate text-[11px] text-muted-foreground">
                  <span aria-hidden>{category.emoji}</span> <span className="hidden sm:inline">{category.label}</span>
                  <span className="sr-only">
                    {category.label}: {quest.status.toLowerCase().replace("_", " ")}
                  </span>
                </p>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-4 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
          <EnergyCheckIn energy={journey.energy} />
          <WeekStrip week={journey.week} />
        </div>

        {journey.rationale && <p className="text-xs text-muted-foreground">{journey.rationale}</p>}
      </div>
    </section>
  );
}

function WeekStrip({ week }: { week: TodayJourney["week"] }) {
  return (
    <ol className="flex items-end gap-1.5" aria-label="This week">
      {week.map((day) => {
        const ratio = day.total > 0 ? day.completed / day.total : 0;
        return (
          <li key={day.date} className="flex flex-col items-center gap-1" title={`${displayDateOnly(day.date)}: ${day.total ? `${day.completed}/${day.total}` : "no quests"}`}>
            <div className="flex h-8 w-5 items-end overflow-hidden rounded-md bg-muted">
              <div className={cn("w-full rounded-md", day.isToday ? "bg-primary" : "bg-primary/60")} style={{ height: `${Math.max(ratio * 100, day.total ? 8 : 0)}%` }} />
            </div>
            <span className={cn("text-[10px]", day.isToday ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {weekday.format(new Date(`${day.date}T00:00:00Z`)).slice(0, 2)}
            </span>
            <span className="sr-only">{day.total ? `${day.completed} of ${day.total} quests` : "No quests"}</span>
          </li>
        );
      })}
    </ol>
  );
}
