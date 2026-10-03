"use client";

import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { HudLabel, Meter } from "@/components/journey/hud";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { ATTRIBUTES } from "@/modules/progression/attributes";
import type { QuestCompletionPayload } from "@/modules/quests/completion";
import { Glyph } from "@/components/common/glyph";

export type QuestResultState = { title: string; payload: QuestCompletionPayload };

/**
 * The moment after a completion: what it earned, and where the day now
 * stands area by area, with the area just moved lit up. It sits in the
 * corner and leaves on its own — a result, not an interruption.
 */
export function QuestResult({ result, onClose }: { result: QuestResultState; onClose: () => void }) {
  const { payload } = result;
  const { progression, skill } = payload;

  useEffect(() => {
    const timer = window.setTimeout(onClose, 9000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="hud-panel fixed inset-x-4 bottom-4 z-40 animate-rise p-4 shadow-2xl motion-reduce:animate-none sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <HudLabel className="text-success">Quest complete</HudLabel>
          <p className="truncate font-semibold">{result.title}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
          <XIcon />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {progression.xpAwarded > 0 && (
          <span className="rounded-md border border-success/50 bg-success/10 px-2 py-0.5 font-mono text-sm font-semibold tabular-nums">+{progression.xpAwarded} XP</span>
        )}
        {progression.attributes.map((award) => {
          const meta = ATTRIBUTES.find((attribute) => attribute.key === award.attribute);
          return (
            <span key={award.attribute} className="rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-[0.1em] uppercase">
              {meta?.label ?? award.attribute} +{award.amount}
            </span>
          );
        })}
        {skill?.awarded && (
          <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
            {skill.skillName} {skill.leveledUp ? `→ Lv ${skill.level}` : `+${skill.xpAwarded}`}
          </span>
        )}
      </div>

      {payload.day.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <HudLabel>Today</HudLabel>
          <ul className="space-y-1.5">
            {payload.day.map((area) => {
              const current = area.lifeArea === payload.lifeArea;
              return (
                <li key={area.lifeArea} className="grid grid-cols-[1.25rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                  <span aria-hidden className="text-sm">
                    <Glyph emoji={LIFE_AREAS[area.lifeArea].emoji} />
                  </span>
                  <Meter
                    percent={area.offered ? (area.completed / area.offered) * 100 : 0}
                    label={`${LIFE_AREAS[area.lifeArea].label} today: ${area.completed} of ${area.offered}`}
                    size="sm"
                    tone={current || area.completed > 0 ? "success" : "muted"}
                    className={cn(current && "glow-success")}
                  />
                  <span className={cn("text-right font-mono text-[11px] tabular-nums", current ? "text-foreground" : "text-muted-foreground")}>
                    {area.completed}/{area.offered}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Holds the latest completion result for a component that completes quests. */
export function useQuestResult() {
  const [result, setResult] = useState<QuestResultState | null>(null);
  // Stable, so the result's auto-close timer isn't restarted by every re-render.
  const clearQuestResult = useCallback(() => setResult(null), []);
  return { questResult: result, showQuestResult: setResult, clearQuestResult };
}
