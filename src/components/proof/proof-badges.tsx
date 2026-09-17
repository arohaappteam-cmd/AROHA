import { BadgeCheckIcon, BotIcon, CircleDotIcon, ClipboardCheckIcon, CrownIcon, UserRoundCheckIcon } from "lucide-react";

import type { AssessmentEvaluator } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { EVALUATOR_LABEL } from "@/modules/assessments/grading";
import { PROOF_TIER_META, type ProofTier } from "@/modules/proof/tiers";

/** Full literal classes per tier so Tailwind can see them. */
const TIER_STYLE: Record<ProofTier, { chip: string; icon: typeof BadgeCheckIcon }> = {
  NONE: { chip: "bg-muted text-muted-foreground", icon: CircleDotIcon },
  PRACTICED: { chip: "bg-sky-500/12 text-sky-600 dark:text-sky-300", icon: CircleDotIcon },
  TESTED: { chip: "bg-violet-500/12 text-violet-600 dark:text-violet-300", icon: ClipboardCheckIcon },
  DEMONSTRATED: { chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300", icon: BadgeCheckIcon },
  MASTERED: { chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300", icon: CrownIcon },
};

export function ProofTierBadge({ tier, className }: { tier: ProofTier; className?: string }) {
  const { chip, icon: Icon } = TIER_STYLE[tier];
  return (
    <span
      title={PROOF_TIER_META[tier].description}
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", chip, className)}
    >
      <Icon className="size-3" aria-hidden />
      {PROOF_TIER_META[tier].label}
    </span>
  );
}

const EVALUATOR_ICON: Record<AssessmentEvaluator, typeof BotIcon> = {
  AUTO_GRADED: ClipboardCheckIcon,
  AI: BotIcon,
  SELF_REVIEW: UserRoundCheckIcon,
};

const EVALUATOR_HINT: Record<AssessmentEvaluator, string> = {
  AUTO_GRADED: "Graded automatically against the answer key.",
  AI: "Scored by the AI reviewer against the rubric; the pass mark is applied by AROHA.",
  SELF_REVIEW: "Rated by you against the rubric, with evidence attached. Anyone can check the evidence.",
};

/** Always shown beside a result, so proof is honest about who judged it. */
export function EvaluatorBadge({ evaluator, className }: { evaluator: AssessmentEvaluator; className?: string }) {
  const Icon = EVALUATOR_ICON[evaluator];
  return (
    <span title={EVALUATOR_HINT[evaluator]} className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Icon className="size-3" aria-hidden />
      {EVALUATOR_LABEL[evaluator]}
    </span>
  );
}
