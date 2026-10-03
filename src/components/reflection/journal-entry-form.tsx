"use client";

import { LoaderCircleIcon, LockKeyholeIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DayMood } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { JOURNAL_BODY_MAX } from "@/modules/reflection/journal";
import { MOOD_OPTIONS } from "@/modules/reflection/reflection";
import { Glyph } from "@/components/common/glyph";

export type JournalFormValues = { title: string; body: string; mood: DayMood | null; date: string };

export function JournalEntryForm({
  initial,
  maxDate,
  submit,
  cancelHref,
  submitLabel,
}: {
  initial: JournalFormValues;
  maxDate: string;
  submit: (input: unknown) => Promise<ActionResult>;
  cancelHref: string;
  submitLabel: string;
}) {
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldError = (field: string) => (result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        // Success redirects; only failures come back.
        startTransition(async () => setResult(await submit(values)));
      }}
    >
      <p className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <LockKeyholeIcon className="size-3.5 shrink-0" aria-hidden />
        Private. Only you can see your journal — it never appears on your passport or timeline, and it is never sent to AI.
      </p>

      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <div className="space-y-1.5">
          <Label htmlFor="journal-title">
            Title <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="journal-title"
            maxLength={120}
            value={values.title}
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="journal-date">Date</Label>
          <Input
            id="journal-date"
            type="date"
            max={maxDate}
            value={values.date}
            onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
          />
          {fieldError("date") && <p className="text-xs text-destructive">{fieldError("date")}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="journal-body">Entry</Label>
        <Textarea
          id="journal-body"
          rows={14}
          maxLength={JOURNAL_BODY_MAX}
          value={values.body}
          onChange={(event) => setValues((current) => ({ ...current, body: event.target.value }))}
          placeholder="Write whatever's on your mind."
          className="leading-relaxed"
          autoFocus
        />
        {fieldError("body") && <p className="text-xs text-destructive">{fieldError("body")}</p>}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Mood <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((option) => {
            const active = values.mood === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                onClick={() => setValues((current) => ({ ...current, mood: active ? null : option.key }))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                  active ? "border-primary bg-primary/12 font-medium text-primary" : "hover:border-primary/50",
                )}
              >
                <span aria-hidden><Glyph emoji={option.emoji} /></span>
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {result && !result.ok && !fieldError("body") && !fieldError("date") && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          {submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
