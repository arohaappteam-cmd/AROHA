"use client";

import { useState, useTransition } from "react";

import type { ActionResult } from "@/lib/action-result";

/** Runs a server action in a transition and keeps its pending/error state. */
export function useActionRunner() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  return { pending, error, setError, run };
}
