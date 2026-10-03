import type { AreaProgress, LifeAreaProgress as Progress } from "@/modules/journey/progress";

import { Delta, HudLabel, Meter } from "./hud";
import { Glyph } from "@/components/common/glyph";

function AreaRow({ area, hasPrevious }: { area: AreaProgress; hasPrevious: boolean }) {
  const change = area.percent !== null && area.previousPercent !== null ? area.percent - area.previousPercent : null;
  return (
    <li className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_3rem] items-center gap-3 py-2.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3.5rem_6rem]">
      <p className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="text-lg leading-none">
          <Glyph emoji={area.emoji} />
        </span>
        <span className="truncate font-mono text-[11px] tracking-[0.14em] uppercase">{area.label}</span>
      </p>
      <div className="space-y-1">
        <Meter percent={area.percent ?? 0} label={`${area.label} completion`} tone={area.percent === null ? "muted" : "success"} />
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {area.settled === 0 ? "No quests settled" : `${area.completed} of ${area.settled} done · ${area.share}% of your effort`}
        </p>
      </div>
      <p className="text-right text-base font-semibold tabular-nums">{area.percent === null ? "–" : `${area.percent}%`}</p>
      <p className="hidden text-right sm:block">{hasPrevious && area.percent !== null ? <Delta value={change} unit=" pts" /> : null}</p>
    </li>
  );
}

/**
 * How each life area is going in the chosen range: the share of offered
 * quests completed. Activity in AROHA — never a score of the person.
 */
export function LifeAreaProgress({ areas, hasPrevious }: { areas: Progress; hasPrevious: boolean }) {
  return (
    <div className="space-y-5">
      <ul className="divide-y">
        {areas.core.map((area) => (
          <AreaRow key={area.lifeArea} area={area} hasPrevious={hasPrevious} />
        ))}
      </ul>

      {areas.extra.length > 0 && (
        <div>
          <HudLabel>Also active</HudLabel>
          <ul className="divide-y">
            {areas.extra.map((area) => (
              <AreaRow key={area.lifeArea} area={area} hasPrevious={hasPrevious} />
            ))}
          </ul>
        </div>
      )}

      {areas.quiet.length > 0 && (
        <div className="space-y-2">
          <HudLabel>Quiet in this range</HudLabel>
          <ul className="flex flex-wrap gap-1.5">
            {areas.quiet.map((area) => (
              <li key={area.lifeArea} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                <span aria-hidden><Glyph emoji={area.emoji} /></span> {area.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Bars show completion of the quests AROHA offered in each area{hasPrevious ? "; the change compares with the period before" : ""}. They track
        activity, not you.
      </p>
    </div>
  );
}
