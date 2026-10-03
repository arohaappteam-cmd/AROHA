"use client";

import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CircleDashedIcon, MinusIcon, SkipForwardIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { QuestStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { formatDay } from "@/modules/journey/calendar";
import type { ActivityCell, ActivityGrid, ActivityRow, CellState } from "@/modules/journey/progress";

import { Meter } from "./hud";
import { Glyph } from "@/components/common/glyph";

const STATE_TEXT: Record<CellState, string> = {
  done: "all done",
  partial: "partly done",
  missed: "not done",
  open: "still open today",
  rest: "nothing scheduled",
  upcoming: "ahead",
};

/** One cell. Shape and fill carry the state, so it never depends on colour alone. */
function Cell({ cell }: { cell: ActivityCell }) {
  switch (cell.state) {
    case "done":
      return (
        <span className="glow-success grid size-full place-items-center rounded-[5px] bg-success text-success-foreground">
          <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
      );
    case "partial":
      return (
        <span className="relative block size-full overflow-hidden rounded-[5px] border border-success/60 bg-background">
          <span className="absolute inset-x-0 bottom-0 bg-success/70" style={{ height: `${(cell.completed / cell.offered) * 100}%` }} />
        </span>
      );
    case "open":
      return <span className="block size-full rounded-[5px] border-2 border-success/50 bg-success/5" />;
    case "missed":
      return (
        <span className="grid size-full place-items-center rounded-[5px] border border-border bg-background">
          <span className="size-1 rounded-full bg-muted-foreground/60" />
        </span>
      );
    case "upcoming":
    case "rest":
      return <span className="block size-full rounded-[5px] bg-muted/40" />;
  }
}

const STATUS_ICON: Partial<Record<QuestStatus, typeof CheckIcon>> = { COMPLETED: CheckIcon, SKIPPED: SkipForwardIcon, EXPIRED: MinusIcon };

const LEGEND: { state: CellState; label: string }[] = [
  { state: "done", label: "Done" },
  { state: "partial", label: "Partly done" },
  { state: "open", label: "Open today" },
  { state: "missed", label: "Not done" },
  { state: "rest", label: "Nothing scheduled" },
];

/**
 * The weekly quest log as a matrix: life areas down the side, days across.
 * Tap a day to see the quests behind its cells.
 */
export function QuestActivityGrid({ grid }: { grid: ActivityGrid }) {
  const [weekIndex, setWeekIndex] = useState(grid.weeks.length - 1);
  const week = grid.weeks[weekIndex];
  const [selected, setSelected] = useState<string | null>(() => week.days.find((day) => day.isToday)?.date ?? null);
  const day = week.days.find((entry) => entry.date === selected) ?? null;

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(grid.weeks.length - 1, weekIndex + delta));
    setWeekIndex(next);
    setSelected(grid.weeks[next].days.find((entry) => entry.isToday)?.date ?? null);
  };

  const rowLabel = (row: ActivityRow) => (
    <th scope="row" className="pr-2 text-left font-normal">
      <span className="flex items-center gap-2 text-xs">
        <span aria-hidden className="text-base leading-none">
          <Glyph emoji={row.emoji} />
        </span>
        <span className="hidden font-mono tracking-[0.12em] text-muted-foreground uppercase sm:inline">{row.label}</span>
        <span className="sr-only sm:hidden">{row.label}</span>
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Previous week" disabled={weekIndex === 0} onClick={() => go(-1)}>
            <ChevronLeftIcon />
          </Button>
          <p className="min-w-40 text-center font-mono text-xs tracking-[0.12em] uppercase" aria-live="polite">
            {weekIndex === grid.weeks.length - 1 ? "This week" : week.label}
          </p>
          <Button variant="outline" size="icon-sm" aria-label="Next week" disabled={weekIndex === grid.weeks.length - 1} onClick={() => go(1)}>
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-xs">
          <Meter percent={week.offered ? (week.completed / week.offered) * 100 : 0} label="Quests completed this week" size="sm" className="flex-1" />
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {week.completed}/{week.offered}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[19rem] border-separate border-spacing-1.5">
          <caption className="sr-only">Quests by life area and day, {week.label}</caption>
          <thead>
            <tr>
              <td />
              {week.days.map((entry) => (
                <th key={entry.date} scope="col" className="p-0">
                  <button
                    type="button"
                    disabled={entry.isFuture}
                    aria-pressed={entry.date === selected}
                    aria-label={`${formatDay(entry.date, "longDay")}: ${entry.completed} of ${entry.offered} quests done`}
                    onClick={() => setSelected(entry.date === selected ? null : entry.date)}
                    className={cn(
                      "flex w-full flex-col items-center rounded-md py-1 font-mono text-[10px] leading-tight transition-colors disabled:opacity-40",
                      entry.date === selected ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      entry.isToday && entry.date !== selected && "text-success",
                    )}
                  >
                    <span className="tracking-[0.1em] uppercase">{entry.weekday.slice(0, 1)}<span className="hidden sm:inline">{entry.weekday.slice(1)}</span></span>
                    <span className="text-xs tabular-nums">{entry.dayOfMonth}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.key}>
                {rowLabel(row)}
                {week.days.map((entry) => {
                  const cell = entry.cells[row.key];
                  return (
                    <td key={entry.date} className="p-0">
                      <button
                        type="button"
                        disabled={entry.isFuture}
                        onClick={() => setSelected(entry.date)}
                        aria-label={`${row.label}, ${formatDay(entry.date, "longDay")}: ${STATE_TEXT[cell.state]}${cell.offered ? ` (${cell.completed} of ${cell.offered})` : ""}`}
                        title={`${row.label} · ${STATE_TEXT[cell.state]}${cell.offered ? ` · ${cell.completed}/${cell.offered}` : ""}`}
                        className={cn(
                          "mx-auto block aspect-square w-full max-w-10 min-w-7 rounded-md p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          entry.date === selected && "bg-foreground/10",
                        )}
                      >
                        <Cell cell={cell} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legend">
        {LEGEND.map((item) => (
          <li key={item.state} className="flex items-center gap-1.5">
            <span className="size-4" aria-hidden>
              <Cell cell={{ state: item.state, completed: 1, offered: 2 }} />
            </span>
            {item.label}
          </li>
        ))}
      </ul>

      {day && (
        <div className="animate-rise rounded-xl border bg-background/40 p-4 motion-reduce:animate-none" aria-live="polite">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{formatDay(day.date, "longDay")}</p>
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              {day.completed} of {day.offered} done · +
              {day.quests.filter((quest) => quest.status === "COMPLETED").reduce((sum, quest) => sum + quest.xpReward, 0)} XP
            </p>
          </div>
          {day.quests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quests were scheduled — a rest day.</p>
          ) : (
            <ul className="divide-y">
              {day.quests.map((quest) => {
                const Icon = STATUS_ICON[quest.status] ?? CircleDashedIcon;
                const done = quest.status === "COMPLETED";
                return (
                  <li key={quest.id} className="flex items-center gap-3 py-2">
                    <span
                      className={cn("grid size-6 shrink-0 place-items-center rounded-md", done ? "bg-success text-success-foreground" : "border text-muted-foreground")}
                      aria-hidden
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span aria-hidden><Glyph emoji={LIFE_AREAS[quest.lifeArea].emoji} /></span>
                    <Link href={`/quests/${quest.id}`} className={cn("min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline", !done && "text-muted-foreground")}>
                      {quest.title}
                    </Link>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                      {done ? `+${quest.xpReward}` : quest.status.toLowerCase().replace("_", " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
