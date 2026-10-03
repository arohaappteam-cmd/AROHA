"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AVATAR_COLORS,
  AVATAR_EMBLEMS,
  AVATAR_STYLES,
  evolutionForTier,
  type AvatarAppearance,
  type AvatarColor,
  type AvatarEmblem,
} from "@/modules/identity/avatar";
import type { TierTitle } from "@/modules/progression/levels";
import { cn } from "@/lib/utils";
import { saveAppearanceAction } from "@/server/actions/identity.actions";

import { Glyph } from "../../common/glyph";
import { CharacterAvatar } from "../character-avatar";
import { SaveBar } from "./save-bar";
import { useSave } from "./use-save";

const PREVIEW_TIERS: TierTitle[] = ["Beginner", "Explorer", "Practitioner", "Advanced", "Master"];

type AppearanceValues = AvatarAppearance & { motto: string };

export function AppearanceEditor({
  initial,
  name,
  tier,
  everSaved,
}: {
  initial: AppearanceValues;
  name: string;
  tier: TierTitle;
  everSaved: boolean;
}) {
  const { value, setValue, dirty, changed, pending, result, submit } = useSave(
    initial,
    (v) => saveAppearanceAction({ ...v, motto: v.motto.trim() }),
    { everSaved },
  );
  const update = (patch: Partial<AppearanceValues>) => setValue((current) => ({ ...current, ...patch }));

  return (
    <div>
      <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
        <div className="flex flex-col items-center gap-4">
          <div className="grid size-56 place-items-center rounded-2xl bg-muted/40">
            <CharacterAvatar appearance={value} name={name} tier={tier} size={160} />
          </div>
          <div className="w-full space-y-2">
            <p className="text-center text-xs text-muted-foreground">Your avatar evolves as you grow</p>
            <ul className="flex justify-center gap-1.5" aria-label="Avatar evolution by tier">
              {PREVIEW_TIERS.map((previewTier) => {
                const evolution = evolutionForTier(previewTier);
                return (
                  <li
                    key={previewTier}
                    title={`${previewTier}: ${evolution.rings} ring${evolution.rings === 1 ? "" : "s"}${evolution.glow ? ", glow" : ""}`}
                    className={cn("rounded-md p-0.5", previewTier === tier && "bg-primary/15 ring-1 ring-primary/40")}
                  >
                    <CharacterAvatar appearance={value} name={name} tier={previewTier} size={34} />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Style</legend>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_STYLES.map((style) => (
                <button
                  key={style.key}
                  type="button"
                  aria-pressed={value.style === style.key}
                  onClick={() => update({ style: style.key })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    value.style === style.key ? "border-primary bg-primary/10" : "hover:border-foreground/30",
                  )}
                >
                  <CharacterAvatar appearance={{ ...value, style: style.key }} name={name} tier="Beginner" size={48} />
                  <span className="text-sm font-medium">{style.label}</span>
                  <span className="hidden text-xs text-muted-foreground sm:block">{style.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Color</legend>
            <div className="flex flex-wrap gap-2.5">
              {(Object.entries(AVATAR_COLORS) as [AvatarColor, (typeof AVATAR_COLORS)[AvatarColor]][]).map(
                ([key, color]) => (
                  <button
                    key={key}
                    type="button"
                    title={color.label}
                    aria-label={color.label}
                    aria-pressed={value.color === key}
                    onClick={() => update({ color: key })}
                    className={cn(
                      "size-9 rounded-full ring-offset-2 ring-offset-card transition-transform outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring",
                      value.color === key && "ring-2 ring-foreground",
                    )}
                    style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                  />
                ),
              )}
            </div>
          </fieldset>

          <fieldset className="space-y-2" disabled={value.style === "MONOGRAM"}>
            <legend className="text-sm font-medium">
              Emblem
              {value.style === "MONOGRAM" && (
                <span className="ml-2 font-normal text-muted-foreground">Monogram uses your initials</span>
              )}
            </legend>
            <div className={cn("grid grid-cols-5 gap-1.5 sm:grid-cols-10", value.style === "MONOGRAM" && "opacity-40")}>
              {(Object.entries(AVATAR_EMBLEMS) as [AvatarEmblem, (typeof AVATAR_EMBLEMS)[AvatarEmblem]][]).map(
                ([key, emblem]) => (
                  <button
                    key={key}
                    type="button"
                    title={emblem.label}
                    aria-label={emblem.label}
                    aria-pressed={value.emblem === key}
                    onClick={() => update({ emblem: key })}
                    className={cn(
                      "grid aspect-square place-items-center rounded-lg border text-xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      value.emblem === key ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted",
                    )}
                  >
                    <Glyph emoji={emblem.glyph} />
                  </button>
                ),
              )}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="motto">
              Motto <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="motto"
              value={value.motto}
              onChange={(event) => update({ motto: event.target.value })}
              maxLength={80}
              placeholder="e.g. Small steps, every day."
            />
          </div>
        </div>
      </div>

      <SaveBar pending={pending} result={result} dirty={dirty} changed={changed} onSave={submit} label="Save avatar" />
    </div>
  );
}
