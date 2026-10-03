import { cn } from "@/lib/utils";
import { formatDay } from "@/modules/journey/calendar";
import type { CharacterJourney } from "@/modules/journey/character";

import { HudLabel, Meter } from "./hud";

const numberFormat = new Intl.NumberFormat("en");

/**
 * How the character got here: every tier on the ladder with the day it was
 * reached, where "you" stand, and what the XP actually came from.
 */
export function CharacterProgress({ character }: { character: CharacterJourney }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ol className="relative space-y-1">
        {character.tiers.map((tier, index) => {
          const lit = tier.state === "reached" || tier.state === "current";
          const isLast = index === character.tiers.length - 1;
          return (
            <li key={tier.title} className="relative flex gap-4 pb-4">
              {!isLast && (
                <span
                  aria-hidden
                  className={cn("absolute top-7 bottom-0 left-[0.85rem] w-px", tier.state === "reached" ? "bg-success" : "bg-border")}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold",
                  tier.state === "current" && "glow-success bg-success text-success-foreground ring-4 ring-success/20",
                  tier.state === "reached" && "bg-success/80 text-success-foreground",
                  tier.state === "next" && "border-2 border-dashed border-success/50 bg-card text-muted-foreground",
                  tier.state === "future" && "border bg-card text-muted-foreground",
                )}
                aria-hidden
              >
                {tier.minLevel}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className={cn("font-mono text-xs tracking-[0.22em] uppercase", lit ? "text-foreground" : "text-muted-foreground")}>{tier.title}</span>
                  <span className="text-xs text-muted-foreground">Level {tier.minLevel}+</span>
                  {tier.state === "current" && <span className="font-mono text-[10px] tracking-[0.2em] text-success uppercase">You · Lv {character.level}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tier.reachedOn
                    ? `Reached ${formatDay(tier.reachedOn, "dayMonth")} ${tier.reachedOn.slice(0, 4)}`
                    : tier.state === "current"
                      ? "Where everyone starts"
                      : tier.state === "next" && character.nextTier
                        ? `${numberFormat.format(character.nextTier.xpNeeded)} XP to go`
                        : "Ahead"}
                </p>
                {tier.state === "current" && (
                  <div className="mt-2 max-w-xs space-y-1">
                    <Meter percent={character.percent} label={`Progress to level ${character.level + 1}`} size="sm" />
                    <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {numberFormat.format(character.xpToNextLevel)} XP to level {character.level + 1}
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="space-y-5">
        <div className="space-y-3">
          <HudLabel>What built your level</HudLabel>
          {character.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your first completed quest starts this list.</p>
          ) : (
            <ul className="space-y-2.5">
              {character.sources.map((source) => (
                <li key={source.key} className="space-y-1">
                  <p className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{source.label}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      +{numberFormat.format(source.xp)} XP · {source.share}%
                    </span>
                  </p>
                  <Meter percent={source.share} label={`${source.label}: ${source.share}% of your XP`} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {character.recentLevels.length > 0 && (
          <div className="space-y-2">
            <HudLabel>Recent level-ups</HudLabel>
            <ul className="flex flex-wrap gap-2">
              {character.recentLevels.map((moment) => (
                <li key={moment.level} className="rounded-lg border px-2.5 py-1.5 text-center">
                  <p className="text-sm font-semibold">Lv {moment.level}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{formatDay(moment.date, "dayMonth")}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
