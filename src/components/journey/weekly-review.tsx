import { cn } from "@/lib/utils";
import { formatDay } from "@/modules/journey/calendar";
import type { WeeklyReview as Review } from "@/modules/journey/reviews";

import { Delta, HudLabel } from "./hud";

const numberFormat = new Intl.NumberFormat("en");

/** Two bars on one scale: this week lit, last week as a quiet reference. */
function Versus({ current, previous, label }: { current: number; previous: number; label: string }) {
  const max = Math.max(current, previous, 1);
  return (
    <div className="space-y-1" role="img" aria-label={`${label}: ${current} this week, ${previous} over the same days last week`}>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="glow-success h-full origin-left animate-grow-x rounded-full bg-success motion-reduce:animate-none" style={{ width: `${(current / max) * 100}%` }} />
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted/60">
        <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${(previous / max) * 100}%` }} />
      </div>
    </div>
  );
}

const RARITY_LABEL: Record<string, string> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

/**
 * The end-of-week report: this week so far against the same days of last
 * week, so a Tuesday is never measured against a whole week.
 */
export function WeeklyReview({ review }: { review: Review }) {
  const headline = [
    { label: "Quests", current: review.quests.current, previous: review.quests.previous, unit: "completed" },
    { label: "XP", current: review.xp.current, previous: review.xp.previous, unit: "earned" },
  ];

  return (
    <div className="space-y-6">
      {review.quests.current === 0 && review.quests.previous === 0 && (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          A quiet stretch — nothing completed this week or over the same days last week. One quest today starts the next report.
        </p>
      )}

      <p className="font-mono text-xs text-muted-foreground">
        {formatDay(review.window.from, "dayMonth")} – {formatDay(review.window.to, "dayMonth")} · day {review.daysElapsed} of 7 ·{" "}
        {review.activeDays} active {review.activeDays === 1 ? "day" : "days"}
        {review.bestDay && <> · best day {formatDay(review.bestDay.date, "weekdayDay")} ({review.bestDay.completed} quests)</>}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {headline.map((item) => (
          <div key={item.label} className="space-y-2 rounded-xl border bg-background/40 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <HudLabel>{item.label}</HudLabel>
              <Delta value={item.current - item.previous} suffix="vs same days last week" />
            </div>
            <p className="text-3xl font-semibold">
              {numberFormat.format(item.current)} <span className="font-mono text-xs font-normal text-muted-foreground">{item.unit}</span>
            </p>
            <Versus current={item.current} previous={item.previous} label={item.label} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <HudLabel>By area · this week vs the same days last week</HudLabel>
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {review.areas.map((area) => (
            <li key={area.lifeArea} className="grid grid-cols-[1.5rem_minmax(0,1fr)_4.5rem] items-center gap-2">
              <span aria-hidden className="text-base">
                {area.emoji}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="truncate font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{area.label}</p>
                <Versus current={area.current} previous={area.previous} label={area.label} />
              </div>
              <p className="text-right">
                <span className="text-sm font-semibold tabular-nums">{area.current}</span>
                <Delta value={area.current - area.previous} className="ml-1" />
              </p>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-4 rounded-full bg-success" />
            This week
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-1 w-4 rounded-full bg-muted-foreground/50" />
            Same days last week
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <HudLabel>Achievements this week</HudLabel>
          {review.achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground">None this week — yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {review.achievements.map((achievement) => (
                <li key={achievement.slug} className="flex items-center gap-2 text-sm">
                  <span aria-hidden className="text-lg">
                    {achievement.emoji}
                  </span>
                  <span className="font-medium">{achievement.name}</span>
                  <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{RARITY_LABEL[achievement.rarity]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2">
          <HudLabel>Skills this week</HudLabel>
          {review.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skill practice recorded yet this week.</p>
          ) : (
            <ul className="space-y-1.5">
              {review.skills.map((skill) => (
                <li key={skill.skillId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    <span aria-hidden>{skill.treeEmoji}</span> {skill.name}
                  </span>
                  <span className={cn("shrink-0 font-mono text-xs tabular-nums", skill.levelTo > skill.levelFrom ? "text-success" : "text-muted-foreground")}>
                    +{skill.xp} XP{skill.levelTo > skill.levelFrom && ` · Lv ${skill.levelTo}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
