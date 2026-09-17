import { MoonStarIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moodMeta } from "@/modules/reflection/reflection";
import type { ReflectionView } from "@/server/services/reflection.service";

/**
 * The end of the daily loop (spec §44–45): complete quests → reflect →
 * tomorrow adapts. Prominent in the evening or once the core day is done;
 * quiet otherwise. Once written, it shows the day's summary instead.
 */
export function EveningReflectionCard({
  reflection,
  prominent,
  coreCompleted,
  coreTotal,
}: {
  reflection: ReflectionView | null;
  prominent: boolean;
  coreCompleted: number;
  coreTotal: number;
}) {
  if (reflection) {
    const mood = moodMeta(reflection.mood);
    return (
      <section aria-label="Today's reflection" className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-start">
        <SparklesIcon className="size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">
            Today, reflected{" "}
            {mood && (
              <span className="font-normal text-muted-foreground">
                · <span aria-hidden>{mood.emoji}</span> {mood.label}
              </span>
            )}
          </p>
          {reflection.aiSummary && <p className="line-clamp-2 text-sm text-muted-foreground">{reflection.aiSummary}</p>}
          {reflection.aiSuggestion && <p className="text-sm">For tomorrow: {reflection.aiSuggestion}</p>}
        </div>
        <Link href="/journal/reflect" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Edit
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-label="End-of-day reflection"
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center",
        prominent ? "border-primary/40 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)]" : "border-dashed",
      )}
    >
      <MoonStarIcon className={cn("size-7 shrink-0", prominent ? "text-primary" : "text-muted-foreground")} aria-hidden />
      <div className="flex-1 space-y-1">
        <p className="font-semibold">{prominent ? "Close out the day" : "Reflect later today"}</p>
        <p className="text-sm text-muted-foreground">
          {coreTotal > 0 ? `${coreCompleted} of ${coreTotal} core quests done. ` : ""}
          What did you learn, what went well, what was hard? Your answers tune tomorrow&apos;s quests.
        </p>
      </div>
      <Link href="/journal/reflect" className={buttonVariants({ variant: prominent ? "default" : "outline" })}>
        Reflect
      </Link>
    </section>
  );
}
