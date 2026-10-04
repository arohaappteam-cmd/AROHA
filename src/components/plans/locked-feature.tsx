import { CheckIcon, LockKeyholeIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { PlanTier } from "@/generated/prisma/enums";
import { PLANS } from "@/modules/plans/catalogue";
import { cn } from "@/lib/utils";

import { PLAN_STYLE, PlanBadge } from "./plan-badge";

/**
 * Stands in for a page or section the user's plan doesn't include: what it
 * is, what's inside, and where to go next. Never a blank wall.
 */
export function LockedFeature({
  tier,
  title,
  description,
  points,
  className,
}: {
  tier: PlanTier;
  title: string;
  description: string;
  points: readonly string[];
  className?: string;
}) {
  const plan = PLANS[tier];
  const style = PLAN_STYLE[tier];

  return (
    <section
      aria-label={`${title} — part of ${plan.name}`}
      className={cn("rounded-3xl border bg-card p-6 md:p-8", className)}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl border bg-background/60", style.accent)}>
          <LockKeyholeIcon className="size-6" aria-hidden />
        </span>
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <PlanBadge tier={tier} label={`${plan.name} · coming soon`} />
            <h2 className="text-xl font-semibold tracking-tight text-balance md:text-2xl">{title}</h2>
            <p className="max-w-prose text-sm text-pretty text-muted-foreground">{description}</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm">
                <CheckIcon className={cn("mt-0.5 size-4 shrink-0", style.accent)} aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link href="/plans" className={buttonVariants({ size: "sm" })}>
              Compare plans
            </Link>
            <Link href="/" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Back to today
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
