import Link from "next/link";

import { cn } from "@/lib/utils";
import type { JourneyRangeKey } from "@/modules/journey/calendar";
import type { YearlyJourney as Year } from "@/modules/journey/reviews";

import { HudLabel } from "./hud";
import { Glyph } from "@/components/common/glyph";

const numberFormat = new Intl.NumberFormat("en");

/**
 * The year zoomed out: XP and quests per month, with the moments that
 * mattered pinned under the month they happened in.
 */
export function YearlyJourney({ year, range }: { year: Year; range: JourneyRangeKey }) {
  const max = Math.max(1, ...year.months.map((month) => month.xp));
  const hasAnything = year.totals.xp > 0 || year.totals.events > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt>
              <HudLabel>XP in {year.year}</HudLabel>
            </dt>
            <dd className="text-2xl font-semibold">{numberFormat.format(year.totals.xp)}</dd>
          </div>
          <div>
            <dt>
              <HudLabel>Quests</HudLabel>
            </dt>
            <dd className="text-2xl font-semibold">{numberFormat.format(year.totals.completed)}</dd>
          </div>
          <div>
            <dt>
              <HudLabel>Milestone moments</HudLabel>
            </dt>
            <dd className="text-2xl font-semibold">{year.totals.events}</dd>
          </div>
        </dl>
        {year.years.length > 1 && (
          <nav aria-label="Year" className="flex gap-1">
            {year.years.map((entry) => (
              <Link
                key={entry}
                href={`/journey?range=${range}&year=${entry}#year`}
                aria-current={entry === year.year ? "page" : undefined}
                className={cn(
                  "rounded-lg border px-2.5 py-1 font-mono text-xs",
                  entry === year.year ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {entry}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {!hasAnything ? (
        <p className="text-sm text-muted-foreground">Nothing recorded in {year.year} yet — the year fills in as you go.</p>
      ) : (
        <ol className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-6 lg:grid-cols-12">
          {year.months.map((month) => (
            <li key={month.month} className={cn("flex gap-3 bg-card p-3 sm:flex-col sm:gap-2", month.future && "opacity-50")}>
              <div className="w-10 shrink-0 sm:w-auto">
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{month.label}</p>
                <div className="mt-1 hidden h-20 items-end sm:flex" role="img" aria-label={`${month.label}: ${month.xp} XP`}>
                  {month.xp > 0 && (
                    <div
                      className="glow-success w-full origin-bottom animate-grow-y rounded-t-[4px] bg-success motion-reduce:animate-none"
                      style={{ height: `${Math.max(6, (month.xp / max) * 100)}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted sm:hidden" aria-hidden>
                  <div className="h-full rounded-full bg-success" style={{ width: `${(month.xp / max) * 100}%` }} />
                </div>
                <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {month.future ? "–" : `${numberFormat.format(month.xp)} XP · ${month.completed} q`}
                </p>
                {month.events.length > 0 && (
                  <ul className="space-y-1">
                    {month.events.slice(0, 3).map((event) => (
                      <li key={event.id} className={cn("flex items-start gap-1.5 text-xs leading-snug", event.major ? "text-foreground" : "text-muted-foreground")}>
                        <span aria-hidden><Glyph emoji={event.emoji} /></span>
                        {event.href ? (
                          <Link href={event.href} className="line-clamp-2 underline-offset-4 hover:underline">
                            {event.title}
                          </Link>
                        ) : (
                          <span className="line-clamp-2">{event.title}</span>
                        )}
                      </li>
                    ))}
                    {month.events.length > 3 && (
                      <li>
                        <Link href={`/journey/timeline`} className="text-[11px] text-muted-foreground underline-offset-4 hover:underline">
                          +{month.events.length - 3} more
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
