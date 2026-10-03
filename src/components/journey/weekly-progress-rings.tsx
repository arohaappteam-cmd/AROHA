import { cn } from "@/lib/utils";
import { formatDay } from "@/modules/journey/calendar";
import type { WeekRing } from "@/modules/journey/progress";

import { HudPanel } from "./hud";
import { ProgressRing } from "./progress-ring";

/**
 * This month, week by week: what share of the quests each week offered got
 * done. Weeks still ahead are drawn as empty tracks, not as zeroes.
 */
export function WeeklyProgressRings({ label, weeks }: { label: string; weeks: WeekRing[] }) {
  return (
    <HudPanel
      id="month-rings"
      index="01"
      label="This month"
      title={label}
      description="Each ring is the share of that week's quests you completed. Skipped quests count; today's open ones don't yet."
    >
      <ol className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] sm:overflow-visible sm:px-0">
        {weeks.map((week) => {
          const span = `${formatDay(week.from, "dayMonth")} – ${formatDay(week.to, "dayMonth")}`;
          const upcoming = week.state === "upcoming";
          return (
            <li
              key={week.from}
              className={cn(
                "flex w-36 shrink-0 snap-start flex-col items-center gap-2 rounded-xl border bg-background/40 px-3 py-4 text-center sm:w-auto",
                week.state === "current" && "border-success/50 bg-success/5",
                upcoming && "opacity-60",
              )}
            >
              <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                {week.label}
                {week.state === "current" && <span className="text-success"> · now</span>}
              </p>
              <ProgressRing
                value={week.percent}
                size={104}
                label={
                  upcoming
                    ? `${week.label}, ${span}: still ahead`
                    : week.percent === null
                      ? `${week.label}, ${span}: no quests settled`
                      : `${week.label}, ${span}: ${week.percent}% — ${week.completed} of ${week.settled} quests`
                }
              >
                <div>
                  <p className="text-2xl font-semibold">{upcoming ? "—" : week.percent === null ? "–" : `${week.percent}%`}</p>
                  <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {upcoming ? "ahead" : `${week.completed}/${week.settled}`}
                  </p>
                </div>
              </ProgressRing>
              <p className="text-xs text-muted-foreground">{span}</p>
              {!upcoming && <p className="font-mono text-[11px] text-muted-foreground tabular-nums">+{week.xp.toLocaleString("en")} XP</p>}
            </li>
          );
        })}
      </ol>
    </HudPanel>
  );
}
