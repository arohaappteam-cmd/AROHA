"use client";

import { BatteryFullIcon, BatteryLowIcon, BatteryMediumIcon, LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";

import type { DayEnergy } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { setDayEnergyAction } from "@/server/actions/quest.actions";

const OPTIONS: { key: DayEnergy; label: string; hint: string; icon: typeof BatteryFullIcon }[] = [
  { key: "LOW", label: "Low", hint: "Lighter quests. Rest counts too.", icon: BatteryLowIcon },
  { key: "NORMAL", label: "Normal", hint: "A balanced day.", icon: BatteryMediumIcon },
  { key: "HIGH", label: "High", hint: "A little more stretch.", icon: BatteryFullIcon },
];

/** Energy check-in (spec §55): adapts quests you haven't started yet. */
export function EnergyCheckIn({ energy }: { energy: DayEnergy }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(energy);
  const [error, setError] = useState<string | null>(null);
  const current = pending ? optimistic : energy;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p className="text-sm font-medium">How&apos;s your energy today?</p>
      <div role="radiogroup" aria-label="Today's energy" className="inline-flex rounded-lg border bg-muted/30 p-0.5">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = current === option.key;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.hint}
              disabled={pending}
              onClick={() => {
                if (option.key === energy) return;
                setError(null);
                setOptimistic(option.key);
                startTransition(async () => {
                  const result = await setDayEnergyAction(option.key);
                  if (!result.ok) setError(result.error);
                });
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {pending ? (
          <span className="inline-flex items-center gap-1">
            <LoaderCircleIcon className="size-3 animate-spin" aria-hidden /> Adjusting your quests…
          </span>
        ) : error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          OPTIONS.find((o) => o.key === current)?.hint
        )}
      </p>
    </div>
  );
}
