"use client";

import { ArrowDownIcon, ArrowUpIcon, StarIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { LifeArea } from "@/generated/prisma/enums";
import {
  LIFE_AREA_LIST,
  LIFE_AREAS,
  MAX_FOCUS_AREAS,
  MAX_INTENTION_LENGTH,
} from "@/modules/identity/life-areas";
import { cn } from "@/lib/utils";
import { saveLifeAreasAction } from "@/server/actions/identity.actions";

import { SaveBar } from "./save-bar";
import { useSave } from "./use-save";
import { Glyph } from "@/components/common/glyph";

export type LifeAreasEditorValue = {
  active: Record<LifeArea, boolean>;
  intentions: Record<LifeArea, string>;
  /** Focus areas in rank order. */
  focus: LifeArea[];
};

function toPayload(value: LifeAreasEditorValue) {
  // Focus areas first, in rank order; the service ranks by position.
  const ordered = [
    ...value.focus,
    ...LIFE_AREA_LIST.map((meta) => meta.key).filter((key) => !value.focus.includes(key)),
  ];
  return ordered.map((key) => ({
    lifeArea: key,
    isActive: LIFE_AREAS[key].core || value.active[key],
    isFocus: value.focus.includes(key),
    intention: value.intentions[key].trim(),
  }));
}

export function LifeAreasEditor({ initial }: { initial: LifeAreasEditorValue }) {
  const { value, setValue, dirty, changed, pending, result, submit } = useSave(initial, (v) =>
    saveLifeAreasAction(toPayload(v)),
  );
  const focusFull = value.focus.length >= MAX_FOCUS_AREAS;

  function toggleActive(key: LifeArea, active: boolean) {
    setValue((current) => ({
      ...current,
      active: { ...current.active, [key]: active },
      focus: active ? current.focus : current.focus.filter((k) => k !== key),
    }));
  }

  function toggleFocus(key: LifeArea) {
    setValue((current) => {
      if (current.focus.includes(key)) {
        return { ...current, focus: current.focus.filter((k) => k !== key) };
      }
      if (current.focus.length >= MAX_FOCUS_AREAS) return current;
      return { ...current, focus: [...current.focus, key] };
    });
  }

  function move(key: LifeArea, direction: -1 | 1) {
    setValue((current) => {
      const focus = [...current.focus];
      const index = focus.indexOf(key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= focus.length) return current;
      [focus[index], focus[target]] = [focus[target], focus[index]];
      return { ...current, focus };
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">Current focus</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {value.focus.length}/{MAX_FOCUS_AREAS}
          </p>
        </div>
        {value.focus.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
            Star up to {MAX_FOCUS_AREAS} areas below. Fewer priorities make real progress more likely.
          </p>
        ) : (
          <ol className="space-y-2">
            {value.focus.map((key, index) => {
              const meta = LIFE_AREAS[key];
              return (
                <li key={key} className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 sm:w-48 sm:shrink-0">
                    <span className="w-4 text-xs font-medium text-primary tabular-nums">{index + 1}</span>
                    <span aria-hidden className="text-lg">
                      <Glyph emoji={meta.emoji} />
                    </span>
                    <span className="font-medium">{meta.label}</span>
                  </div>
                  <label htmlFor={`intention-${key}`} className="sr-only">
                    What do you want from {meta.label}?
                  </label>
                  <Input
                    id={`intention-${key}`}
                    value={value.intentions[key]}
                    maxLength={MAX_INTENTION_LENGTH}
                    placeholder={`What do you want from ${meta.label.toLowerCase()}?`}
                    onChange={(event) =>
                      setValue((current) => ({
                        ...current,
                        intentions: { ...current.intentions, [key]: event.target.value },
                      }))
                    }
                  />
                  <div className="flex shrink-0 gap-1 self-end sm:self-auto">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${meta.label} up`} disabled={index === 0} onClick={() => move(key, -1)}>
                      <ArrowUpIcon />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${meta.label} down`} disabled={index === value.focus.length - 1} onClick={() => move(key, 1)}>
                      <ArrowDownIcon />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${meta.label} from focus`} onClick={() => toggleFocus(key)}>
                      <XIcon />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {LIFE_AREA_LIST.map((meta) => {
          const active = meta.core || value.active[meta.key];
          const isFocus = value.focus.includes(meta.key);
          const switchId = `active-${meta.key}`;
          return (
            <li
              key={meta.key}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                isFocus && "border-primary/50",
                !active && "border-dashed",
              )}
            >
              <span aria-hidden className={cn("text-2xl", !active && "grayscale opacity-60")}>
                <Glyph emoji={meta.emoji} />
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor={switchId} className="flex items-center gap-2 text-sm font-medium">
                  {meta.label}
                  {meta.core && (
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Core</span>
                  )}
                </label>
                <p className="truncate text-xs text-muted-foreground">
                  {meta.core ? "Part of every balanced day" : meta.description}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-pressed={isFocus}
                aria-label={isFocus ? `Remove ${meta.label} from focus` : `Make ${meta.label} a focus`}
                title={!active ? "Activate this area to focus on it" : !isFocus && focusFull ? `You already have ${MAX_FOCUS_AREAS} focus areas` : undefined}
                disabled={!active || (!isFocus && focusFull)}
                onClick={() => toggleFocus(meta.key)}
              >
                <StarIcon className={cn(isFocus && "fill-primary text-primary")} />
              </Button>
              <Switch
                id={switchId}
                checked={active}
                disabled={meta.core}
                onCheckedChange={(checked) => toggleActive(meta.key, checked)}
                aria-label={`${meta.label} active`}
              />
            </li>
          );
        })}
      </ul>

      <SaveBar pending={pending} result={result} dirty={dirty} changed={changed} onSave={submit} label="Save life areas" />
    </div>
  );
}
