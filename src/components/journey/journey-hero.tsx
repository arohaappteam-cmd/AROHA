import { CharacterAvatar } from "@/components/character/character-avatar";
import type { JourneyView } from "@/server/services/journey.service";

import { HudLabel, Meter } from "./hud";

const numberFormat = new Intl.NumberFormat("en");

/** The top of the map: who you are right now, and how far to the next level. */
export function JourneyHero({ journey }: { journey: JourneyView }) {
  const { character, who, xp, questsCompleted } = journey;
  const stats = [
    { label: "Quests completed", value: numberFormat.format(questsCompleted), hint: "all time" },
    { label: "XP this week", value: numberFormat.format(xp.thisWeek), hint: "since Monday" },
    { label: "XP this month", value: numberFormat.format(xp.thisMonth), hint: journey.month.label },
    character.nextTier
      ? { label: `Next tier · ${character.nextTier.title}`, value: numberFormat.format(character.nextTier.xpNeeded), hint: `XP to level ${character.nextTier.minLevel}` }
      : { label: "Tier", value: character.tier, hint: "the highest tier" },
  ];

  return (
    <section aria-labelledby="journey-hero-title" className="hud-panel relative overflow-hidden p-5 sm:p-8">
      <div aria-hidden className="hud-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--success)_14%,transparent),transparent_60%)]"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <CharacterAvatar appearance={who.appearance} name={who.name} tier={character.tier} size={104} className="self-start sm:self-center" />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1">
            <HudLabel>Aroha journey · {who.name}</HudLabel>
            <h1 id="journey-hero-title" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-4xl font-semibold tracking-tight sm:text-5xl">Level {character.level}</span>
              <span className="font-mono text-sm font-medium tracking-[0.3em] text-success uppercase">{character.tier}</span>
            </h1>
          </div>

          <div className="space-y-2">
            <Meter percent={character.percent} label={`Level ${character.level} progress`} className="h-2.5" />
            <p className="flex flex-wrap justify-between gap-2 font-mono text-xs text-muted-foreground tabular-nums">
              <span>
                <span className="text-foreground">{numberFormat.format(character.xpIntoLevel)}</span> / {numberFormat.format(character.xpForNextLevel)} XP
              </span>
              <span>
                {numberFormat.format(character.xpToNextLevel)} XP to level {character.level + 1}
              </span>
            </p>
          </div>
        </div>
      </div>

      <dl className="relative mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card px-4 py-3">
            <dt className="truncate font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{stat.label}</dt>
            <dd className="mt-1 text-xl font-semibold">{stat.value}</dd>
            <dd className="text-xs text-muted-foreground">{stat.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
