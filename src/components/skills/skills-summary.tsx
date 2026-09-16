import { ArrowRightIcon, CircleCheckIcon, CircleDotIcon, SparklesIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { SkillsOverview } from "@/server/services/skill.service";

const numberFormat = new Intl.NumberFormat("en");

/** The reading of the whole system: what I know → learning → can unlock next. */
export function SkillsSummary({ totals }: { totals: SkillsOverview["totals"] }) {
  const steps = [
    {
      icon: CircleCheckIcon,
      count: totals.known,
      title: "What I know",
      detail: totals.mastered > 0 ? `${totals.mastered} mastered` : "skills at level 1+",
      tone: "text-emerald-600 dark:text-emerald-300",
    },
    {
      icon: CircleDotIcon,
      count: totals.learning,
      title: "What I'm learning",
      detail: `${numberFormat.format(totals.totalXp)} skill XP earned`,
      tone: "text-violet-600 dark:text-violet-300",
    },
    {
      icon: SparklesIcon,
      count: totals.availableNext,
      title: "What I can unlock next",
      detail: "ready whenever you are",
      tone: "text-amber-600 dark:text-amber-300",
    },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {steps.map((step, index) => (
          <div key={step.title} className="flex flex-1 items-center gap-4">
            <div className="flex items-center gap-3">
              <step.icon className={`size-5 shrink-0 ${step.tone}`} aria-hidden />
              <div>
                <p className="text-2xl font-semibold tabular-nums">{step.count}</p>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <ArrowRightIcon className="ml-auto hidden size-4 shrink-0 text-muted-foreground/50 sm:block" aria-hidden />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
