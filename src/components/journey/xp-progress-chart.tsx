"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "@/lib/utils";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { labelIndexes, monotonePath, niceCeiling } from "@/modules/journey/chart";
import { percentChange, type XpFilter, type XpProgress } from "@/modules/journey/progress";

import { Delta, HudLabel } from "./hud";

const numberFormat = new Intl.NumberFormat("en");
const WIDTH = 1000;
const HEIGHT = 220;
const BUCKET_WORD = { day: "day", week: "week", month: "month" } as const;

function filterLabel(filter: XpFilter): string {
  return filter === "ALL" ? "All XP" : LIFE_AREAS[filter].label;
}

/**
 * XP over the chosen range: one line, a soft wash beneath it, and a
 * crosshair that snaps to the nearest day (or week, or month). Every value
 * is also in the table view, so nothing depends on hovering.
 */
export function XpProgressChart({ xp, rangeLabel }: { xp: XpProgress; rangeLabel: string }) {
  const [filter, setFilter] = useState<XpFilter>("ALL");
  const [active, setActive] = useState<number | null>(null);
  const series = xp.series.find((entry) => entry.filter === filter) ?? xp.series[0];
  const { points } = series;
  const n = points.length;

  const max = niceCeiling(Math.max(...points.map((point) => point.xp), 0));
  const min = Math.min(0, ...points.map((point) => point.xp));
  const x = (index: number) => (n === 1 ? WIDTH / 2 : (index / (n - 1)) * WIDTH);
  const y = (value: number) => HEIGHT - ((value - min) / (max - min)) * HEIGHT;
  const coords = points.map((point, index): [number, number] => [x(index), y(point.xp)]);
  const line = monotonePath(coords);
  const area = n > 1 ? `${line}L${WIDTH},${y(0)}L0,${y(0)}Z` : "";
  const change = percentChange(series.total, series.previous);
  const empty = points.every((point) => point.xp === 0);
  const ticks = [max, max / 2, 0];

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setActive(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  };
  const step = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActive((current) => Math.max(0, Math.min(n - 1, (current ?? n - 1) + (event.key === "ArrowRight" ? 1 : -1))));
  };

  const activePoint = active === null ? null : points[active];
  const activeLeft = active === null ? 0 : (x(active) / WIDTH) * 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt>
              <HudLabel>{filterLabel(filter)} · {rangeLabel}</HudLabel>
            </dt>
            <dd className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight">{numberFormat.format(series.total)}</span>
              <span className="font-mono text-xs text-muted-foreground">XP</span>
              {series.previous !== null && <Delta value={change} unit="%" suffix="vs the period before" />}
            </dd>
          </div>
          {filter === "ALL" && (
            <>
              <div>
                <dt>
                  <HudLabel>Average</HudLabel>
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {numberFormat.format(xp.perDay)} <span className="font-mono text-xs font-normal text-muted-foreground">XP / day</span>
                </dd>
              </div>
              {xp.best && (
                <div>
                  <dt>
                    <HudLabel>Best {BUCKET_WORD[xp.bucket]}</HudLabel>
                  </dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {numberFormat.format(xp.best.xp)} <span className="font-mono text-xs font-normal text-muted-foreground">{xp.best.title}</span>
                  </dd>
                </div>
              )}
            </>
          )}
        </dl>

        <div role="group" aria-label="Show XP from" className="flex flex-wrap gap-1 rounded-lg border bg-background/40 p-1">
          {xp.series.map((entry) => (
            <button
              key={entry.filter}
              type="button"
              aria-pressed={entry.filter === filter}
              title={filterLabel(entry.filter)}
              onClick={() => setFilter(entry.filter)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                entry.filter === filter ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.filter === "ALL" ? "All" : <span aria-label={filterLabel(entry.filter)}>{LIFE_AREAS[entry.filter].emoji}</span>}
            </button>
          ))}
        </div>
      </div>

      <figure className="space-y-2">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
          <div className="relative h-52 font-mono text-[10px] text-muted-foreground tabular-nums sm:h-60" aria-hidden>
            {ticks.map((tick) => (
              <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${(y(tick) / HEIGHT) * 100}%` }}>
                {numberFormat.format(tick)}
              </span>
            ))}
          </div>

          <div
            role="img"
            tabIndex={0}
            aria-label={`${filterLabel(filter)} per ${BUCKET_WORD[xp.bucket]} over ${rangeLabel}: ${numberFormat.format(series.total)} XP in total. Use the arrow keys to step through, or open the table below.`}
            onPointerMove={pick}
            onPointerLeave={() => setActive(null)}
            onKeyDown={step}
            onFocus={() => setActive((current) => current ?? n - 1)}
            onBlur={() => setActive(null)}
            className="relative h-52 touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-60"
          >
            {ticks.map((tick) => (
              <div key={tick} aria-hidden className="absolute inset-x-0 border-t border-border/70" style={{ top: `${(y(tick) / HEIGHT) * 100}%` }} />
            ))}

            {empty ? (
              <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
                No {filter === "ALL" ? "" : `${filterLabel(filter).toLowerCase()} `}XP in this range yet — completed quests will draw the line.
              </p>
            ) : (
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                <defs>
                  <linearGradient id="xp-wash" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {area && <path d={area} fill="url(#xp-wash)" />}
                <path d={line} fill="none" className="glow-success stroke-success" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
            )}

            {!empty && n > 0 && (
              <span
                aria-hidden
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success ring-2 ring-card"
                style={{ left: `${(x(n - 1) / WIDTH) * 100}%`, top: `${(y(points[n - 1].xp) / HEIGHT) * 100}%` }}
              />
            )}

            {activePoint && (
              <>
                <div aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${activeLeft}%` }} />
                <span
                  aria-hidden
                  className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success ring-2 ring-card"
                  style={{ left: `${activeLeft}%`, top: `${(y(activePoint.xp) / HEIGHT) * 100}%` }}
                />
                <div
                  role="status"
                  className={cn(
                    "pointer-events-none absolute top-1 z-10 rounded-lg border bg-popover px-3 py-2 text-xs whitespace-nowrap shadow-lg",
                    activeLeft < 25 ? "translate-x-2" : activeLeft > 75 ? "-translate-x-[calc(100%+0.5rem)]" : "-translate-x-1/2",
                  )}
                  style={{ left: `${activeLeft}%` }}
                >
                  <p className="flex items-center gap-2">
                    <span aria-hidden className="h-0.5 w-3 rounded-full bg-success" />
                    <span className="text-base font-semibold tabular-nums">{numberFormat.format(activePoint.xp)}</span>
                    <span className="text-muted-foreground">XP</span>
                  </p>
                  <p className="text-muted-foreground">{activePoint.title}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative ml-[3.25rem] h-4 font-mono text-[10px] text-muted-foreground" aria-hidden>
          {labelIndexes(n).map((index) => (
            <span
              key={points[index].key}
              className={cn(
                "absolute whitespace-nowrap",
                index === 0 ? "" : index === n - 1 ? "-translate-x-full" : "-translate-x-1/2",
                // Phones get four labels; wider screens get six.
                !labelIndexes(n, 4).includes(index) && "hidden sm:inline",
              )}
              style={{ left: `${(x(index) / WIDTH) * 100}%` }}
            >
              {points[index].label}
            </span>
          ))}
        </div>

        {filter !== "ALL" && (
          <figcaption className="text-xs text-muted-foreground">
            Area views count XP from that area&apos;s quests. Achievements, challenges and goals add to All XP only.
          </figcaption>
        )}
      </figure>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left">
            <caption className="sr-only">
              {filterLabel(filter)} per {BUCKET_WORD[xp.bucket]}, {rangeLabel}
            </caption>
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">{BUCKET_WORD[xp.bucket][0].toUpperCase() + BUCKET_WORD[xp.bucket].slice(1)}</th>
                <th className="py-1 text-right font-medium">XP</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {points.map((point) => (
                <tr key={point.key} className="border-t border-border/60">
                  <td className="py-1">{point.title}</td>
                  <td className="py-1 text-right">{numberFormat.format(point.xp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
