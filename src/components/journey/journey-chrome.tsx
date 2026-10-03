import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JOURNEY_RANGE_KEYS, JOURNEY_RANGES, type JourneyRangeKey } from "@/modules/journey/calendar";

export const JOURNEY_SECTIONS = [
  { id: "month-rings", label: "Month" },
  { id: "trends", label: "Trends" },
  { id: "quest-log", label: "Quest log" },
  { id: "consistency", label: "Consistency" },
  { id: "goals", label: "Goals" },
  { id: "skills", label: "Skills" },
  { id: "week", label: "Week" },
  { id: "month-review", label: "Month review" },
  { id: "year", label: "Year" },
  { id: "character", label: "Character" },
  { id: "achievements", label: "Achievements" },
] as const;

/** A sticky index of the map's sections — the screen is long by design. */
export function SectionNav() {
  return (
    <nav aria-label="Journey sections" className="sticky top-14 z-30 -mx-4 border-b bg-background/85 px-4 py-2 backdrop-blur md:top-0 md:-mx-8 md:px-8">
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {JOURNEY_SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              className="block rounded-md px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The time range for the trend panels below it. A link per range, so it's shareable and works without JavaScript. */
export function RangeFilter({ active, year }: { active: JourneyRangeKey; year: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Time range" className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
        {JOURNEY_RANGE_KEYS.map((key) => (
          <Link
            key={key}
            href={`/journey?range=${key}&year=${year}#trends`}
            scroll={false}
            aria-current={key === active ? "page" : undefined}
            title={JOURNEY_RANGES[key].label}
            className={cn(
              "rounded-md px-3 py-1.5 font-mono text-xs tracking-[0.12em] transition-colors",
              key === active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {JOURNEY_RANGES[key].short}
          </Link>
        ))}
      </nav>
      <p className="text-xs text-muted-foreground">Range applies to XP, life areas and energy below.</p>
    </div>
  );
}

/** Shown until there's a history to draw: honest about why the charts are quiet. */
export function JourneyBeginning() {
  return (
    <div className="hud-panel flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border bg-muted">
        <CompassIcon className="size-5" aria-hidden />
      </span>
      <div className="flex-1 space-y-1">
        <p className="font-mono text-xs tracking-[0.24em] text-success uppercase">Your journey is just beginning</p>
        <p className="text-sm text-pretty text-muted-foreground">
          Complete a few more quests to reveal your progress patterns. Everything here is drawn from what you actually do — nothing is filled in to
          look busy.
        </p>
      </div>
      <Link href="/" className={buttonVariants({ size: "sm" })}>
        Today&apos;s quests
      </Link>
    </div>
  );
}
