import { CheckIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SetupState } from "@/modules/identity/setup";
import { cn } from "@/lib/utils";

export function SetupChecklist({
  setup,
  title = "Bring your character to life",
}: {
  setup: SetupState;
  title?: string;
}) {
  if (setup.isComplete) return null;
  const percent = Math.round((setup.completed / setup.total) * 100);

  return (
    <Card className="border-primary/30 ring-primary/25">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          The more AROHA knows about you, the better it can shape your days.{" "}
          <span className="tabular-nums">
            {setup.completed} of {setup.total} done
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {setup.steps.map((step) => (
            <li key={step.key}>
              <Link
                href={step.href}
                className={cn(
                  "group flex h-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  step.done
                    ? "border-transparent bg-muted/40 text-muted-foreground"
                    : "hover:border-primary/50 hover:bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border",
                    step.done && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {step.done && <CheckIcon className="size-3" aria-hidden />}
                </span>
                <span className={cn("flex-1", step.done && "line-through decoration-muted-foreground/40")}>
                  {step.label}
                </span>
                {!step.done && (
                  <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                )}
                <span className="sr-only">{step.done ? "(done)" : "(to do)"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
