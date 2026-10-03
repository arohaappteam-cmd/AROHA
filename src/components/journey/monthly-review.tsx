import { cn } from "@/lib/utils";
import { formatDay } from "@/modules/journey/calendar";
import type { MonthlyReview as Review } from "@/modules/journey/reviews";

import { Delta, HudLabel } from "./hud";
import { Glyph } from "@/components/common/glyph";

const numberFormat = new Intl.NumberFormat("en");

/** A column that grows from the floor; empty weeks keep their slot. */
function Column({ value, max, label, faded }: { value: number; max: number; label: string; faded: boolean }) {
  return (
    <div className="flex h-16 items-end justify-center" role="img" aria-label={label}>
      {value > 0 && (
        <div
          className={cn("w-full max-w-6 origin-bottom animate-grow-y rounded-t-[4px] motion-reduce:animate-none", faded ? "bg-success/45" : "bg-success")}
          style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
        />
      )}
    </div>
  );
}

/**
 * The month as small multiples: one row per measure, one column per week,
 * every row on its own scale so each reads at a glance.
 */
export function MonthlyReview({ review }: { review: Review }) {
  const { weeks, totals } = review;
  const xpMax = Math.max(1, ...weeks.map((week) => week.xp));
  const questMax = Math.max(1, ...weeks.map((week) => week.completed));
  const columns = { gridTemplateColumns: `minmax(5.5rem,8rem) repeat(${weeks.length}, minmax(3rem,1fr))` };

  return (
    <div className="space-y-5">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <dt>
            <HudLabel>XP this month</HudLabel>
          </dt>
          <dd className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{numberFormat.format(totals.xp)}</span>
            <Delta value={totals.xp - totals.previousXp} suffix={`vs ${totals.previousLabel}`} />
          </dd>
        </div>
        <div>
          <dt>
            <HudLabel>Quests this month</HudLabel>
          </dt>
          <dd className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{numberFormat.format(totals.completed)}</span>
            <Delta value={totals.completed - totals.previousCompleted} suffix={`vs ${totals.previousLabel}`} />
          </dd>
        </div>
      </dl>

      <div className="overflow-x-auto">
        <div className="min-w-[28rem] space-y-1">
          <div className="grid items-end gap-2" style={columns}>
            <span />
            {weeks.map((week) => (
              <p key={week.from} className="text-center">
                <span className={cn("block font-mono text-[10px] tracking-[0.18em] uppercase", week.state === "current" ? "text-success" : "text-muted-foreground")}>
                  W{week.index}
                </span>
                <span className="block text-[10px] text-muted-foreground">{formatDay(week.from, "dayMonth")}</span>
              </p>
            ))}
          </div>

          <div className="grid items-end gap-2 border-t pt-2" style={columns}>
            <HudLabel className="self-center">XP</HudLabel>
            {weeks.map((week) => (
              <div key={week.from}>
                <Column value={week.xp} max={xpMax} faded={week.state === "upcoming"} label={`Week ${week.index}: ${week.xp} XP`} />
                <p className="text-center font-mono text-[11px] tabular-nums">{week.state === "upcoming" ? "–" : numberFormat.format(week.xp)}</p>
              </div>
            ))}
          </div>

          <div className="grid items-end gap-2 border-t pt-2" style={columns}>
            <HudLabel className="self-center">Quests</HudLabel>
            {weeks.map((week) => (
              <div key={week.from}>
                <Column value={week.completed} max={questMax} faded={week.state === "upcoming"} label={`Week ${week.index}: ${week.completed} quests`} />
                <p className="text-center font-mono text-[11px] tabular-nums">{week.state === "upcoming" ? "–" : week.completed}</p>
              </div>
            ))}
          </div>

          {weeks[0]?.areas.map((area, row) => (
            <div key={area.lifeArea} className="grid items-center gap-2 border-t py-2" style={columns}>
              <p className="flex min-w-0 items-center gap-1.5">
                <span aria-hidden><Glyph emoji={area.emoji} /></span>
                <span className="truncate font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">{area.label}</span>
              </p>
              {weeks.map((week) => {
                const cell = week.areas[row];
                return (
                  <div key={week.from} className="space-y-1" title={cell.settled ? `${cell.completed} of ${cell.settled}` : "No quests settled"}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      {cell.percent !== null && <div className="h-full origin-left animate-grow-x rounded-full bg-success motion-reduce:animate-none" style={{ width: `${cell.percent}%` }} />}
                    </div>
                    <p className="text-center font-mono text-[10px] text-muted-foreground tabular-nums">{cell.percent === null ? "–" : `${cell.percent}%`}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Area rows show completion of the quests offered that week. Weeks still ahead stay empty.</p>
    </div>
  );
}
