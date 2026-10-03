"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { formatDay } from "@/modules/journey/calendar";
import { HEATMAP_METRICS, heatLevel, type Heatmap, type HeatmapMetric } from "@/modules/journey/progress";

import { HudLabel } from "./hud";

const LEVEL_CLASS = ["bg-muted", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;
const ROW_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""] as const;

function metricLabel(metric: HeatmapMetric): string {
  return metric === "ALL" ? "All quests" : LIFE_AREAS[metric].label;
}

/**
 * A year of showing up, one square per day. Stronger means more completed.
 * A missed day is just a quieter square — it ends a run, it never erases
 * the days around it.
 */
export function ActivityHeatmap({ heatmap }: { heatmap: Heatmap }) {
  const [metric, setMetric] = useState<HeatmapMetric>("ALL");
  const [hover, setHover] = useState<{ date: string; count: number; left: number; top: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const index = HEATMAP_METRICS.indexOf(metric);
  const stats = heatmap.stats[metric];

  // Open on the most recent weeks; older ones are a scroll away on small screens.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  const statItems = [
    { label: "Active days", value: stats.activeDays },
    { label: "Longest run", value: `${stats.longestRun}d` },
    { label: "Current run", value: `${stats.currentRun}d` },
    { label: metric === "ALL" ? "Quests done" : "Done", value: stats.completed },
  ];

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Show consistency for" className="flex flex-wrap gap-1">
        {HEATMAP_METRICS.map((entry) => (
          <button
            key={entry}
            type="button"
            aria-pressed={entry === metric}
            onClick={() => setMetric(entry)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs transition-colors",
              entry === metric ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {entry !== "ALL" && <span aria-hidden>{LIFE_AREAS[entry].emoji} </span>}
            {metricLabel(entry)}
          </button>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statItems.map((item) => (
          <div key={item.label}>
            <dt>
              <HudLabel>{item.label}</HudLabel>
            </dt>
            <dd className="text-xl font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div ref={frame} className="relative">
        <div ref={scroller} className="overflow-x-auto pb-2">
          <div className="inline-grid grid-cols-[1.75rem_auto] gap-x-1.5">
            <span />
            <div className="relative h-4 font-mono text-[10px] text-muted-foreground" aria-hidden>
              {heatmap.months.map((month) => (
                <span key={`${month.column}-${month.label}`} className="absolute" style={{ left: `${month.column * 15}px` }}>
                  {month.label}
                </span>
              ))}
            </div>

            <div className="grid grid-rows-7 gap-[3px] font-mono text-[10px] leading-3 text-muted-foreground" aria-hidden>
              {ROW_LABELS.map((label, row) => (
                <span key={row} className="h-3">
                  {label}
                </span>
              ))}
            </div>

            <div
              role="img"
              aria-label={`${metricLabel(metric)}: ${stats.activeDays} active days in the last year, longest run ${stats.longestRun} days. The same numbers are listed above.`}
              className="flex gap-[3px]"
              onPointerLeave={() => setHover(null)}
            >
              {heatmap.weeks.map((week) => (
                <div key={week.from} className="grid grid-rows-7 gap-[3px]">
                  {week.days.map((day) => {
                    const count = day.counts[index];
                    return (
                      <span
                        key={day.date}
                        onPointerEnter={(event) => {
                          if (day.future || !frame.current) return;
                          const cell = event.currentTarget.getBoundingClientRect();
                          const box = frame.current.getBoundingClientRect();
                          setHover({ date: day.date, count, left: cell.left - box.left + cell.width / 2, top: cell.top - box.top });
                        }}
                        className={cn("size-3 rounded-[3px]", day.future ? "bg-transparent" : LEVEL_CLASS[heatLevel(metric, count)])}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
            style={{ left: hover.left, top: hover.top }}
          >
            <span className="font-semibold tabular-nums">{hover.count}</span>{" "}
            <span className="text-muted-foreground">
              {metric === "ALL" ? "quests" : metricLabel(metric).toLowerCase()} · {formatDay(hover.date, "longDay")}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>A missed day ends a run — it never erases the days around it.</p>
        <p className="flex items-center gap-1.5" aria-label="Fewer to more completed quests">
          Less
          {LEVEL_CLASS.map((level) => (
            <span key={level} className={cn("size-3 rounded-[3px]", level)} aria-hidden />
          ))}
          More
        </p>
      </div>
    </div>
  );
}
