import { BotIcon, LightbulbIcon, SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { moodMeta } from "@/modules/reflection/reflection";
import type { ReflectionView } from "@/server/services/reflection.service";

/** The day's summary and one idea for tomorrow, labelled with where it came from. */
export function ReflectionSummary({ reflection, className }: { reflection: ReflectionView; className?: string }) {
  if (!reflection.aiSummary) return null;
  const mood = moodMeta(reflection.mood);
  const fromAi = reflection.summarySource === "ai";

  return (
    <div className={cn("space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <SparklesIcon className="size-4 text-primary" aria-hidden />
          Your day, summarised
          {mood && (
            <span className="font-normal text-muted-foreground">
              · <span aria-hidden>{mood.emoji}</span> {mood.label}
            </span>
          )}
        </p>
        <span
          className="flex items-center gap-1 text-xs text-muted-foreground"
          title={fromAi ? "Written by the AI Mentor from your reflection and quests." : "Built from your own words and today's quest record."}
        >
          <BotIcon className="size-3" aria-hidden />
          {fromAi ? "AI summary" : "Summary from your words"}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{reflection.aiSummary}</p>
      {reflection.aiSuggestion && (
        <p className="flex items-start gap-2 rounded-xl bg-background/60 px-3 py-2 text-sm">
          <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <span>
            <span className="font-medium">For tomorrow: </span>
            {reflection.aiSuggestion}
          </span>
        </p>
      )}
    </div>
  );
}
