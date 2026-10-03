"use client";

import { BellIcon, BellRingIcon, LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { setPlanInterestAction } from "@/server/actions/plan.actions";

/** "Notify me" for a tier that isn't on sale yet. Records interest only. */
export function PlanInterestButton({ tier, interested }: { tier: "PRO" | "PREMIUM"; interested: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [on, setOn] = useState(interested);

  function toggle() {
    const next = !on;
    startTransition(async () => {
      const outcome = await setPlanInterestAction({ tier, interested: next });
      setResult(outcome);
      if (outcome.ok) setOn(next);
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant={on ? "outline" : "default"} className="w-full" disabled={pending} onClick={toggle} aria-pressed={on}>
        {pending ? (
          <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
        ) : on ? (
          <BellRingIcon data-icon="inline-start" />
        ) : (
          <BellIcon data-icon="inline-start" />
        )}
        {on ? "You'll be notified" : "Notify me at launch"}
      </Button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </div>
  );
}
