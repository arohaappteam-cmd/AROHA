import { cn } from "@/lib/utils";
import type { StreakState } from "@/modules/streaks/streaks";

const numberFormat = new Intl.NumberFormat("en");

/**
 * Streak overview. The lifetime total leads on purpose: streaks are
 * secondary, progress is primary, and a missed day never takes days away.
 */
export function StreakCards({ streaks }: { streaks: StreakState[] }) {
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {streaks.map((streak) => {
          const alive = streak.current > 0;
          return (
            <li key={streak.key} title={streak.description} className={cn("space-y-2 rounded-xl border bg-card p-4", !alive && "border-dashed")}>
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="text-lg" aria-hidden>
                  {streak.emoji}
                </span>
                {streak.label}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {numberFormat.format(streak.lifetimeDays)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">days lifetime</span>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {alive ? (
                  <>
                    <span className={streak.activeToday ? "font-medium text-emerald-600 dark:text-emerald-300" : "font-medium"}>
                      {streak.current}-day run
                    </span>
                    {streak.activeToday ? " · today counted" : " · today still open"}
                  </>
                ) : streak.lifetimeDays > 0 ? (
                  "No current run — the days above are yours forever"
                ) : (
                  "Not started yet"
                )}
                {streak.longest > 1 && ` · best ${streak.longest}`}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        A missed day ends a run, never your progress — lifetime days and your best run are permanent.
      </p>
    </div>
  );
}
