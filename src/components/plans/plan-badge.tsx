import { CrownIcon, RocketIcon, SproutIcon, type LucideIcon } from "lucide-react";

import type { PlanTier } from "@/generated/prisma/enums";
import { PLANS } from "@/modules/plans/catalogue";
import { cn } from "@/lib/utils";

export const PLAN_STYLE: Record<PlanTier, { icon: LucideIcon; badge: string; accent: string }> = {
  FREE: {
    icon: SproutIcon,
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    accent: "text-emerald-300",
  },
  PRO: {
    icon: RocketIcon,
    badge: "border-violet-400/40 bg-violet-500/15 text-violet-200",
    accent: "text-violet-300",
  },
  PREMIUM: {
    icon: CrownIcon,
    badge: "border-amber-400/40 bg-amber-400/15 text-amber-200",
    accent: "text-amber-300",
  },
};

/** A small pill naming a tier, e.g. on the sidebar or a locked feature. */
export function PlanBadge({ tier, className, label }: { tier: PlanTier; className?: string; label?: string }) {
  const style = PLAN_STYLE[tier];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap",
        style.badge,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label ?? PLANS[tier].name}
    </span>
  );
}
