"use client";

import { LocateFixedIcon } from "lucide-react";
import { startTransition, useActionState, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { matchTimezone } from "@/modules/identity/timezones";
import { saveProfileAction } from "@/server/actions/identity.actions";

import { SaveBar } from "./save-bar";

type ProfileValues = {
  displayName: string;
  pronouns: string;
  bio: string;
  timezone: string;
};

function FieldError({ result, field }: { result: ActionResult | null; field: string }) {
  const message = result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined;
  if (!message) return null;
  return (
    <p id={`${field}-error`} className="text-xs text-destructive">
      {message}
    </p>
  );
}

const subscribeNoop = () => () => {};

export function ProfileEditor({
  initial,
  timezones,
  everSaved,
}: {
  initial: ProfileValues;
  /** Computed on the server so SSR and hydration render identical options. */
  timezones: string[];
  everSaved: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState<ProfileValues | null>(everSaved ? initial : null);
  // Browser timezone is only known on the client; empty during SSR.
  const rawBrowserTimezone = useSyncExternalStore(
    subscribeNoop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
  const browserTimezone = useMemo(
    () => (rawBrowserTimezone ? matchTimezone(rawBrowserTimezone, timezones) : ""),
    [rawBrowserTimezone, timezones],
  );

  const [result, formAction, pending] = useActionState(
    async (previous: ActionResult | null, formData: FormData) => {
      const next = await saveProfileAction(previous, formData);
      if (next.ok) {
        setSaved({
          displayName: String(formData.get("displayName") ?? "").trim(),
          pronouns: String(formData.get("pronouns") ?? "").trim(),
          bio: String(formData.get("bio") ?? "").trim(),
          timezone: String(formData.get("timezone") ?? ""),
        });
      }
      return next;
    },
    null,
  );

  const normalized = {
    displayName: values.displayName.trim(),
    pronouns: values.pronouns.trim(),
    bio: values.bio.trim(),
    timezone: values.timezone,
  };
  const changed = JSON.stringify(normalized) !== JSON.stringify(saved ?? initial);
  const dirty = saved === null || changed;
  const set = (key: keyof ProfileValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const invalid = (field: string) => Boolean(result && !result.ok && result.fieldErrors?.[field]);

  return (
    <form
      className="space-y-5"
      // Dispatch manually: a `<form action>` is auto-reset by React after
      // submitting, which desyncs these controlled fields (notably <select>).
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-2">
          <Label htmlFor="displayName">Name</Label>
          <Input
            id="displayName"
            name="displayName"
            value={values.displayName}
            onChange={set("displayName")}
            maxLength={60}
            autoComplete="name"
            required
            aria-invalid={invalid("displayName")}
            aria-describedby="displayName-error"
          />
          <FieldError result={result} field="displayName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pronouns">
            Pronouns <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="pronouns"
            name="pronouns"
            value={values.pronouns}
            onChange={set("pronouns")}
            maxLength={30}
            placeholder="e.g. she/her"
            aria-invalid={invalid("pronouns")}
          />
          <FieldError result={result} field="pronouns" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">
          About you <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="bio"
          name="bio"
          value={values.bio}
          onChange={set("bio")}
          maxLength={500}
          rows={4}
          placeholder="What you do, what matters to you, where you're headed."
          aria-invalid={invalid("bio")}
        />
        <div className="flex justify-between">
          <FieldError result={result} field="bio" />
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{values.bio.length}/500</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id="timezone"
            name="timezone"
            value={values.timezone}
            onChange={set("timezone")}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-xs dark:bg-input/30"
          >
            {!timezones.includes(values.timezone) && <option value={values.timezone}>{values.timezone}</option>}
            {timezones.map((zone) => (
              <option key={zone} value={zone} className="bg-popover">
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          {browserTimezone && browserTimezone !== values.timezone && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setValues((current) => ({ ...current, timezone: browserTimezone }))}
            >
              <LocateFixedIcon data-icon="inline-start" />
              Use {browserTimezone.replaceAll("_", " ")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Defines when your day starts and ends in AROHA.</p>
        <FieldError result={result} field="timezone" />
      </div>

      <SaveBar pending={pending} result={result} dirty={dirty} changed={changed} label="Save profile" />
    </form>
  );
}
