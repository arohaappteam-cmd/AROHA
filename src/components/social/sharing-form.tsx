"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MAX_HEADLINE_LENGTH, type SocialProfileInput } from "@/modules/social/schemas";
import { saveSocialProfileAction } from "@/server/actions/social.actions";

type ToggleKey = Exclude<keyof SocialProfileInput, "visibility" | "headline">;

const TOGGLES: { key: ToggleKey; label: string; detail: string }[] = [
  { key: "showLevel", label: "Level and XP", detail: "Your level, tier and total XP." },
  { key: "showSkills", label: "Skills", detail: "The skills you've built and how far you've taken them." },
  { key: "showAchievements", label: "Achievements", detail: "How many achievements you've unlocked." },
  {
    key: "onLeaderboards",
    label: "Include me on leaderboards",
    detail: "Off by default. When on, your recent XP, achievement and challenge counts appear on boards — even if you hide them above.",
  },
  { key: "openToMentoring", label: "I'm open to mentoring", detail: "Shows you to people asking for help in skills you've built." },
  { key: "seekingMentor", label: "I'm looking for a mentor", detail: "Lets mentors see that you'd welcome an offer." },
];

/** What the user shares with the community. Everything starts off. */
export function SharingForm({ initial }: { initial: SocialProfileInput }) {
  const { pending, error, run } = useActionRunner();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const isPrivate = values.visibility === "PRIVATE";

  function update<K extends keyof SocialProfileInput>(key: K, value: SocialProfileInput[K]) {
    setSaved(false);
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => saveSocialProfileAction(values), () => setSaved(true));
      }}
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Your community profile</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["PRIVATE", "COMMUNITY"] as const).map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${values.visibility === option ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
            >
              <input
                type="radio"
                name="visibility"
                className="sr-only"
                checked={values.visibility === option}
                onChange={() => update("visibility", option)}
              />
              <p className="text-sm font-medium">{option === "PRIVATE" ? "Private" : "Visible to the community"}</p>
              <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                {option === "PRIVATE"
                  ? "Nobody sees your profile. You can still join guilds, take part in group challenges and browse."
                  : "Members see your name, avatar, pronouns, bio, motto, interests, focus areas and guilds — plus whatever you turn on below."}
              </p>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="headline">
          A line about you <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="headline"
          maxLength={MAX_HEADLINE_LENGTH}
          placeholder="Learning to cook properly. Walking most days."
          value={values.headline ?? ""}
          onChange={(event) => update("headline", event.target.value || null)}
        />
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">What to share</legend>
        {isPrivate && <p className="pb-2 text-sm text-muted-foreground">These apply once your profile is visible to the community.</p>}
        <ul className="divide-y">
          {TOGGLES.map((toggle) => (
            <li key={toggle.key} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <Label htmlFor={toggle.key} className="font-normal">
                  {toggle.label}
                </Label>
                <p className="text-sm text-muted-foreground text-pretty">{toggle.detail}</p>
              </div>
              <Switch
                id={toggle.key}
                checked={values[toggle.key]}
                onCheckedChange={(checked: boolean) => update(toggle.key, checked)}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          Save sharing settings
        </Button>
        {saved && !pending && <p className="text-sm text-muted-foreground">Saved.</p>}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
