import { MoonIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ShadowDebt } from "@/modules/shadow/debt";

const HEADLINE: Record<Exclude<ShadowDebt["level"], "CLEAR">, string> = {
  LIGHT: "A little slipped by",
  BUILDING: "The plan is outgrowing the days",
  HEAVY: "Time to shrink the plan",
};

/**
 * Shadow Debt (spec §29) — a mirror, not a penalty. Renders nothing when
 * clear; otherwise names the pattern and offers ways to lighten the load.
 * No XP is ever touched by this card.
 */
export function ShadowDebtCard({ debt }: { debt: ShadowDebt }) {
  if (debt.level === "CLEAR") return null;

  return (
    <section
      aria-label="Shadow debt"
      className={cn(
        "space-y-2.5 rounded-2xl border p-5",
        debt.level === "LIGHT" && "border-border bg-muted/30",
        debt.level === "BUILDING" && "border-indigo-500/30 bg-indigo-500/5",
        debt.level === "HEAVY" && "border-indigo-500/50 bg-indigo-500/10",
      )}
    >
      <p className="flex items-center gap-2 font-semibold">
        <MoonIcon className="size-4 text-indigo-500 dark:text-indigo-300" aria-hidden />
        {HEADLINE[debt.level]}
      </p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {debt.guidance.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {debt.unresolved} quest{debt.unresolved === 1 ? "" : "s"} expired unfinished in the last two weeks. Nothing is deducted —
        this fades on its own as days are finished or honestly skipped.
      </p>
    </section>
  );
}
