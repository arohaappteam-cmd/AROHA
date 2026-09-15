"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LifeArea } from "@/generated/prisma/enums";
import {
  cleanInterestLabel,
  INTEREST_SUGGESTIONS,
  interestSlug,
  MAX_INTEREST_LENGTH,
  MAX_INTERESTS,
} from "@/modules/identity/interests";
import { LIFE_AREA_LIST, LIFE_AREAS } from "@/modules/identity/life-areas";
import { MIN_INTERESTS_FOR_SETUP } from "@/modules/identity/setup";
import { addInterestAction, removeInterestAction } from "@/server/actions/identity.actions";

import { ChoiceChip } from "./choice-chip";

type Interest = { id: string; label: string; lifeArea: LifeArea | null };

type OptimisticChange =
  | { type: "add"; label: string; lifeArea: LifeArea | null }
  | { type: "remove"; id: string };

export function InterestsEditor({
  interests,
  defaultArea,
}: {
  interests: Interest[];
  defaultArea: LifeArea;
}) {
  const [draft, setDraft] = useState("");
  const [area, setArea] = useState<LifeArea>(defaultArea);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [optimistic, applyChange] = useOptimistic(interests, (state, change: OptimisticChange) =>
    change.type === "add"
      ? [...state, { id: `pending-${interestSlug(change.label)}`, label: change.label, lifeArea: change.lifeArea }]
      : state.filter((interest) => interest.id !== change.id),
  );

  const slugs = new Set(optimistic.map((interest) => interestSlug(interest.label)));
  const atLimit = optimistic.length >= MAX_INTERESTS;
  const suggestions = INTEREST_SUGGESTIONS[area].filter((label) => !slugs.has(interestSlug(label)));

  /** Returns false when the label is rejected before reaching the server. */
  function add(rawLabel: string, lifeArea: LifeArea | null): boolean {
    const label = cleanInterestLabel(rawLabel);
    setError(null);
    if (label.length < 2) {
      setError("Interests need at least 2 characters");
      return false;
    }
    if (slugs.has(interestSlug(label))) {
      setError(`"${label}" is already in your interests`);
      return false;
    }
    startTransition(async () => {
      applyChange({ type: "add", label, lifeArea });
      const result = await addInterestAction({ label, lifeArea });
      if (!result.ok) setError(result.error);
    });
    return true;
  }

  function remove(id: string) {
    if (id.startsWith("pending-")) return;
    setError(null);
    startTransition(async () => {
      applyChange({ type: "remove", id });
      const result = await removeInterestAction(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Your interests</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {optimistic.length}/{MAX_INTERESTS}
          </p>
        </div>
        {optimistic.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing yet. Add at least {MIN_INTERESTS_FOR_SETUP} — anything you enjoy or want to explore.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {optimistic.map((interest) => (
              <li
                key={interest.id}
                className="flex items-center gap-1 rounded-full border bg-muted/40 py-1 pr-1 pl-3 text-sm data-[pending=true]:opacity-60"
                data-pending={interest.id.startsWith("pending-")}
              >
                {interest.lifeArea && (
                  <span aria-hidden className="text-xs">
                    {LIFE_AREAS[interest.lifeArea].emoji}
                  </span>
                )}
                {interest.label}
                <button
                  type="button"
                  onClick={() => remove(interest.id)}
                  aria-label={`Remove ${interest.label}`}
                  className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <XIcon className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (add(draft, null)) setDraft("");
        }}
      >
        <label htmlFor="new-interest" className="sr-only">
          Add an interest
        </label>
        <Input
          id="new-interest"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_INTEREST_LENGTH}
          placeholder="Add anything — e.g. Bouldering, Jazz, Urban planning"
          disabled={atLimit}
        />
        <Button type="submit" variant="secondary" disabled={atLimit || draft.trim().length === 0}>
          <PlusIcon data-icon="inline-start" />
          Add
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-3 rounded-xl bg-muted/30 p-4">
        <p className="text-sm font-medium">Need ideas?</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggestion categories">
          {LIFE_AREA_LIST.map((meta) => (
            <ChoiceChip
              key={meta.key}
              selected={area === meta.key}
              onClick={() => setArea(meta.key)}
              className="px-2.5 py-1 text-xs"
            >
              <span aria-hidden>{meta.emoji}</span>
              {meta.label}
            </ChoiceChip>
          ))}
        </div>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">You&apos;ve added every suggestion here.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((label) => (
              <li key={label}>
                <button
                  type="button"
                  disabled={atLimit}
                  onClick={() => add(label, area)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:opacity-50"
                >
                  <PlusIcon className="size-3" aria-hidden />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
