"use client";

import type { ReactNode } from "react";

import {
  CHALLENGE_LEVEL_OPTIONS,
  DAILY_MINUTE_OPTIONS,
  formatMinutes,
  LEARNING_FORMAT_OPTIONS,
  MOVEMENT_OPTIONS,
  TIME_OF_DAY_OPTIONS,
  type Preferences,
} from "@/modules/identity/preferences";
import { cn } from "@/lib/utils";
import { savePreferencesAction } from "@/server/actions/identity.actions";

import { ChoiceChip } from "./choice-chip";
import { SaveBar } from "./save-bar";
import { useSave } from "./use-save";

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-medium">
        {label}
        {hint && <span className="ml-2 font-normal text-muted-foreground">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function PreferencesEditor({ initial, everSaved }: { initial: Preferences; everSaved: boolean }) {
  const { value, setValue, dirty, changed, pending, result, submit } = useSave(initial, savePreferencesAction, { everSaved });
  const update = (patch: Partial<Preferences>) => setValue((current) => ({ ...current, ...patch }));

  return (
    <div className="space-y-6">
      <Group label="Time for growth on a normal day" hint="Be realistic — AROHA will fit around it">
        <div className="flex flex-wrap gap-2">
          {DAILY_MINUTE_OPTIONS.map((minutes) => (
            <ChoiceChip key={minutes} selected={value.dailyMinutes === minutes} onClick={() => update({ dailyMinutes: minutes })}>
              {formatMinutes(minutes)}
            </ChoiceChip>
          ))}
        </div>
      </Group>

      <Group label="When you have the most energy">
        <div className="flex flex-wrap gap-2">
          {TIME_OF_DAY_OPTIONS.map((option) => (
            <ChoiceChip
              key={option.key}
              selected={value.preferredTimeOfDay === option.key}
              onClick={() => update({ preferredTimeOfDay: option.key })}
            >
              {option.label}
            </ChoiceChip>
          ))}
        </div>
      </Group>

      <Group label="How challenging should days feel?">
        <div className="grid gap-2 sm:grid-cols-3">
          {CHALLENGE_LEVEL_OPTIONS.map((option) => {
            const selected = value.challengeLevel === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ challengeLevel: option.key })}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected ? "border-primary bg-primary/10" : "hover:border-foreground/30",
                )}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Ways you can move" hint="Pick any that fit your life">
        <div className="flex flex-wrap gap-2">
          {MOVEMENT_OPTIONS.map((option) => (
            <ChoiceChip
              key={option.key}
              showCheck
              selected={value.movementOptions.includes(option.key)}
              onClick={() => update({ movementOptions: toggle(value.movementOptions, option.key) })}
            >
              {option.label}
            </ChoiceChip>
          ))}
        </div>
      </Group>

      <Group label="How you like to learn" hint="Pick any">
        <div className="flex flex-wrap gap-2">
          {LEARNING_FORMAT_OPTIONS.map((option) => (
            <ChoiceChip
              key={option.key}
              showCheck
              selected={value.learningFormats.includes(option.key)}
              onClick={() => update({ learningFormats: toggle(value.learningFormats, option.key) })}
            >
              {option.label}
            </ChoiceChip>
          ))}
        </div>
      </Group>

      <SaveBar pending={pending} result={result} dirty={dirty} changed={changed} onSave={submit} label="Save preferences" />
    </div>
  );
}
