"use client";

import { useState, useTransition } from "react";

import type { ActionResult } from "@/lib/action-result";

/**
 * Local editable state plus a save action. `dirty` compares against the last
 * successfully saved value, so the save button only lights up for real
 * changes — or when the value has never been saved, so accepting the
 * defaults is still a deliberate, savable choice.
 */
export function useSave<T>(
  initial: T,
  save: (value: T) => Promise<ActionResult>,
  { everSaved = true }: { everSaved?: boolean } = {},
) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [hasSaved, setHasSaved] = useState(everSaved);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const changed = JSON.stringify(value) !== JSON.stringify(saved);
  const dirty = !hasSaved || changed;

  function submit() {
    const snapshot = value;
    startTransition(async () => {
      const next = await save(snapshot);
      setResult(next);
      if (next.ok) {
        setSaved(snapshot);
        setHasSaved(true);
      }
    });
  }

  return { value, setValue, dirty, changed, pending, result, submit };
}
