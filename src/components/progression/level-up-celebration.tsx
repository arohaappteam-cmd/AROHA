"use client";

import { SparklesIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ATTRIBUTES } from "@/modules/progression/attributes";
import type { ProgressionOutcome } from "@/modules/progression/outcome";
import { Glyph } from "@/components/common/glyph";

/**
 * The level-up moment. Shown over the page after a completion that crossed a
 * level boundary — brief, celebratory, and dismissible.
 */
export function LevelUpCelebration({ outcome, onClose }: { outcome: ProgressionOutcome; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const levelsGained = outcome.level - outcome.previousLevel;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-xp/40 bg-card p-8 text-center shadow-2xl duration-300 animate-in fade-in zoom-in-95"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_30%,transparent),transparent_65%)]"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 z-10"
        >
          <XIcon />
        </Button>

        <div className="relative space-y-5">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.25em] text-xp uppercase">
            <SparklesIcon className="size-4" aria-hidden />
            Level up
          </p>

          <div>
            <p className="text-6xl leading-none font-semibold tabular-nums">{outcome.level}</p>
            <p id="level-up-title" className="mt-2 text-lg font-medium">
              You reached level {outcome.level}
              {levelsGained > 1 && <span className="text-muted-foreground"> (+{levelsGained})</span>}
            </p>
            <p className="text-sm text-muted-foreground">{outcome.tier}</p>
          </div>

          <p className="text-sm text-pretty text-muted-foreground">
            Earned in real life — {outcome.totalXp.toLocaleString("en")} XP total.
          </p>

          {outcome.attributes.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-2">
              {outcome.attributes.map((award) => {
                const meta = ATTRIBUTES.find((a) => a.key === award.attribute);
                return (
                  <li key={award.attribute} className="rounded-full bg-muted px-3 py-1 text-sm">
                    <span aria-hidden><Glyph emoji={meta?.emoji} /> </span>
                    {meta?.label ?? award.attribute} +{award.amount}
                  </li>
                );
              })}
            </ul>
          )}

          <Button onClick={onClose} className="w-full">
            Keep going
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Tracks the most recent level-up so any completion UI can celebrate it. */
export function useLevelUp() {
  const [outcome, setOutcome] = useState<ProgressionOutcome | null>(null);
  return {
    levelUp: outcome,
    clearLevelUp: () => setOutcome(null),
    /** Call with a completion's outcome; only a real level-up is kept. */
    noticeProgression: (next: ProgressionOutcome | undefined) => {
      if (next?.leveledUp) setOutcome(next);
    },
  };
}
