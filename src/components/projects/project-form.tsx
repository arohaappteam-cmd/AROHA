"use client";

import { LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectCategory } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { PROJECT_CATEGORIES, PROJECT_CATEGORY_LIST } from "@/modules/projects/categories";
import type { SkillOptionTree } from "@/server/services/project.service";

import { SkillPicker } from "./skill-picker";

export type ProjectFormValues = {
  title: string;
  description: string;
  category: ProjectCategory | "";
  skillIds: string[];
  reflection: string;
  milestones: string;
};

function Optional() {
  return <span className="font-normal text-muted-foreground">(optional)</span>;
}

export function ProjectForm({
  mode,
  initial,
  skillTrees,
  submit,
  cancelHref,
}: {
  mode: "create" | "edit";
  initial: ProjectFormValues;
  skillTrees: SkillOptionTree[];
  submit: (input: unknown) => Promise<ActionResult>;
  cancelHref: string;
}) {
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: "title" | "description" | "reflection" | "milestones") => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const fieldError = (field: string) => (result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined);

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const next = await submit({
            title: values.title,
            description: values.description,
            category: values.category || undefined,
            skillIds: values.skillIds,
            reflection: values.reflection,
            milestones: values.milestones
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length >= 2),
          });
          // Success redirects; only failures come back.
          setResult(next);
        });
      }}
    >
      <section className="space-y-2">
        <Label htmlFor="title" className="text-base">
          What are you making?
        </Label>
        <Input
          id="title"
          value={values.title}
          onChange={set("title")}
          maxLength={100}
          placeholder="e.g. A booking app for my aunt's bakery"
          aria-invalid={Boolean(fieldError("title"))}
          autoFocus={mode === "create"}
        />
        {fieldError("title") && <p className="text-xs text-destructive">{fieldError("title")}</p>}
      </section>

      <section className="space-y-3">
        <Label className="text-base">What kind of project is it?</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PROJECT_CATEGORY_LIST.map((category) => {
            const active = values.category === category.key;
            return (
              <button
                key={category.key}
                type="button"
                aria-pressed={active}
                onClick={() => setValues((current) => ({ ...current, category: category.key }))}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                  active ? "border-primary bg-primary/10" : "hover:border-primary/50",
                )}
              >
                <span className="text-sm font-medium">
                  <span aria-hidden>{category.emoji}</span> {category.label}
                </span>
                <span className="text-xs text-muted-foreground">{category.example}</span>
              </button>
            );
          })}
        </div>
        {fieldError("category") && <p className="text-xs text-destructive">{fieldError("category")}</p>}
      </section>

      <section className="space-y-2">
        <Label htmlFor="description">
          Description <Optional />
        </Label>
        <Textarea
          id="description"
          rows={3}
          maxLength={1000}
          value={values.description}
          onChange={set("description")}
          placeholder="What it is, who it's for, and what done looks like."
        />
      </section>

      <section className="space-y-2">
        <div>
          <Label className="text-base">Which skills does it use?</Label>
          <p className="text-sm text-muted-foreground">
            Completing the project pays XP into these skills, and its evidence becomes proof of them on your passport.
          </p>
        </div>
        <SkillPicker
          trees={skillTrees}
          selected={values.skillIds}
          onChange={(skillIds) => setValues((current) => ({ ...current, skillIds }))}
          suggestedTrees={values.category ? PROJECT_CATEGORIES[values.category].suggestedTrees : []}
        />
        {fieldError("skillIds") && <p className="text-xs text-destructive">{fieldError("skillIds")}</p>}
      </section>

      {mode === "create" ? (
        <section className="space-y-2">
          <Label htmlFor="milestones">
            Milestones <Optional />
          </Label>
          <Textarea
            id="milestones"
            rows={4}
            value={values.milestones}
            onChange={set("milestones")}
            placeholder={"One per line, e.g.\nSketch the screens\nBuild the booking form\nLaunch to the first customer"}
          />
          <p className="text-xs text-muted-foreground">You can add, tick off and remove milestones later.</p>
        </section>
      ) : (
        <section className="space-y-2">
          <Label htmlFor="reflection">
            What did building it teach you? <Optional />
          </Label>
          <Textarea
            id="reflection"
            rows={4}
            maxLength={1500}
            value={values.reflection}
            onChange={set("reflection")}
            placeholder="What was hard, what you'd do differently, what you'd build next."
          />
        </section>
      )}

      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          {mode === "create" ? "Create project" : "Save changes"}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
