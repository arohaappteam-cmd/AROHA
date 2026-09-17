"use client";

import { FlagIcon, SquareCheckBigIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { abandonExperimentAction, wrapUpExperimentAction } from "@/server/actions/experiment.actions";

export function ExperimentControls({ experimentId, running }: { experimentId: string; running: boolean }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>) => startTransition(async () => setResult(await action()));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {running && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => wrapUpExperimentAction(experimentId))}>
            <SquareCheckBigIcon data-icon="inline-start" />
            I already know — wrap up
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => abandonExperimentAction(experimentId))}>
          <FlagIcon data-icon="inline-start" />
          Set it down
        </Button>
      </div>
      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
