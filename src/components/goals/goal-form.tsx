"use client";

import { LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { LifeArea, StartingPoint } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { STARTING_POINT_OPTIONS } from "@/modules/goals/status";
import { LIFE_AREA_LIST } from "@/modules/identity/life-areas";
import { Glyph } from "@/components/common/glyph";

export type GoalFormValues = {
  title: string;
  lifeArea: LifeArea | "";
  motivation: string;
  target: string;
  description: string;
  startingPoint: StartingPoint;
  deadline: string;
};

type GoalFormAction = (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;

function FieldError({ result, field }: { result: ActionResult | null; field: string }) {
  const message = result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined;
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function Optional() {
  return <span className="font-normal text-muted-foreground">(optional)</span>;
}

export function GoalForm({
  mode,
  initial,
  action,
  cancelHref,
  suggestedAreas = [],
}: {
  mode: "create" | "edit";
  initial: GoalFormValues;
  action: GoalFormAction;
  cancelHref: string;
  /** The user's focus areas, shown first. */
  suggestedAreas?: LifeArea[];
}) {
  const [values, setValues] = useState(initial);
  const [generateRoadmap, setGenerateRoadmap] = useState(true);
  const [result, formAction, pending] = useActionState(action, null);

  const set = (key: keyof GoalFormValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const invalid = (field: string) => Boolean(result && !result.ok && result.fieldErrors?.[field]);

  const areas = [
    ...LIFE_AREA_LIST.filter((a) => suggestedAreas.includes(a.key)),
    ...LIFE_AREA_LIST.filter((a) => !suggestedAreas.includes(a.key)),
  ];

  return (
    <form
      className="space-y-8"
      // Manual dispatch avoids React's automatic form reset on controlled fields.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <section className="space-y-2">
        <Label htmlFor="title" className="text-base">
          What do you want to achieve?
        </Label>
        <Input
          id="title"
          name="title"
          value={values.title}
          onChange={set("title")}
          maxLength={100}
          required
          autoFocus={mode === "create"}
          placeholder="e.g. Run a half marathon, Learn guitar, Open a small bakery"
          className="h-10 text-base"
          aria-invalid={invalid("title")}
        />
        <FieldError result={result} field="title" />
      </section>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Life area</legend>
        <input type="hidden" name="lifeArea" value={values.lifeArea} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {areas.map((area) => {
            const selected = values.lifeArea === area.key;
            return (
              <button
                key={area.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setValues((current) => ({ ...current, lifeArea: area.key }))}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected ? "border-primary bg-primary/10" : "hover:border-foreground/30",
                )}
              >
                <span aria-hidden className="text-lg">
                  <Glyph emoji={area.emoji} />
                </span>
                <span className="min-w-0 flex-1 truncate">{area.label}</span>
                {suggestedAreas.includes(area.key) && (
                  <span className="text-[10px] tracking-wide text-primary uppercase">Focus</span>
                )}
              </button>
            );
          })}
        </div>
        <FieldError result={result} field="lifeArea" />
      </fieldset>

      <section className="space-y-2">
        <Label htmlFor="motivation">Why does this matter to you?</Label>
        <Textarea
          id="motivation"
          name="motivation"
          value={values.motivation}
          onChange={set("motivation")}
          maxLength={500}
          rows={3}
          placeholder="The real reason. It's what keeps you going on hard days."
          aria-invalid={invalid("motivation")}
        />
        <FieldError result={result} field="motivation" />
      </section>

      <div className="grid gap-6 sm:grid-cols-[1fr_12rem]">
        <section className="space-y-2">
          <Label htmlFor="target">What does success look like?</Label>
          <Input
            id="target"
            name="target"
            value={values.target}
            onChange={set("target")}
            maxLength={200}
            placeholder="e.g. Finish a 21 km race, play 5 songs, first 10 customers"
            aria-invalid={invalid("target")}
          />
          <FieldError result={result} field="target" />
        </section>
        <section className="space-y-2">
          <Label htmlFor="deadline">
            Deadline <Optional />
          </Label>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            value={values.deadline}
            onChange={set("deadline")}
            className="scheme-dark"
            aria-invalid={invalid("deadline")}
          />
          <FieldError result={result} field="deadline" />
        </section>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Your starting point</legend>
        <input type="hidden" name="startingPoint" value={values.startingPoint} />
        <div className="grid gap-2 sm:grid-cols-3">
          {STARTING_POINT_OPTIONS.map((option) => {
            const selected = values.startingPoint === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setValues((current) => ({ ...current, startingPoint: option.key }))}
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
      </fieldset>

      <section className="space-y-2">
        <Label htmlFor="description">
          Notes <Optional />
        </Label>
        <Textarea
          id="description"
          name="description"
          value={values.description}
          onChange={set("description")}
          maxLength={1000}
          rows={3}
          placeholder="Anything else: constraints, resources you have, what you've tried."
          aria-invalid={invalid("description")}
        />
        <FieldError result={result} field="description" />
      </section>

      {mode === "create" && (
        <label className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
          {generateRoadmap && <input type="hidden" name="generateRoadmap" value="on" />}
          <Switch
            checked={generateRoadmap}
            onCheckedChange={setGenerateRoadmap}
            className="mt-0.5"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">Start with a suggested roadmap</span>
            <span className="block text-xs text-muted-foreground">
              AROHA breaks your goal into milestones and missions based on your starting point and preferences. You can
              edit everything.
            </span>
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">
        {result && !result.ok && (
          <p role="alert" className="mr-auto flex items-center gap-1.5 text-sm text-destructive">
            <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
            {result.error}
          </p>
        )}
        <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          {mode === "create" ? (pending ? "Creating…" : "Create goal") : pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
