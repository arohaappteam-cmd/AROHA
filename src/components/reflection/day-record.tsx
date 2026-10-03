import { CheckIcon, CircleIcon, MinusIcon } from "lucide-react";
import Link from "next/link";

import { categoryFor } from "@/modules/quests/categories";
import { cn } from "@/lib/utils";
import type { ReflectionDay } from "@/server/services/reflection.service";
import { Glyph } from "@/components/common/glyph";

/** "Today's journey" beside the reflection (spec §45): what actually happened. */
export function DayRecord({ day }: { day: ReflectionDay }) {
  const core = day.quests.filter((quest) => quest.isCore);
  const done = core.filter((quest) => quest.status === "COMPLETED").length;

  if (day.quests.length === 0) {
    return <p className="text-sm text-muted-foreground">No quests were planned for this day — reflect on whatever it held.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold tabular-nums">
          {done} / {core.length}
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">core quests</span>
        </p>
        {day.xpEarned > 0 && <span className="text-sm font-medium text-xp tabular-nums">+{day.xpEarned} XP</span>}
      </div>
      <ul className="space-y-1.5">
        {day.quests.map((quest) => {
          const category = categoryFor(quest.lifeArea);
          const completed = quest.status === "COMPLETED";
          const Icon = completed ? CheckIcon : quest.status === "PENDING" || quest.status === "IN_PROGRESS" ? CircleIcon : MinusIcon;
          return (
            <li key={quest.id}>
              <Link href={`/quests/${quest.id}`} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                <Icon
                  className={cn("mt-0.5 size-4 shrink-0", completed ? "text-emerald-500" : "text-muted-foreground")}
                  aria-label={quest.status.toLowerCase().replace("_", " ")}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !completed && "text-muted-foreground")}>
                    <span aria-hidden><Glyph emoji={category.emoji} /></span> {quest.title}
                    {!quest.isCore && <span className="ml-1.5 text-xs text-muted-foreground">(extra)</span>}
                  </span>
                  {quest.note && <span className="block text-xs text-muted-foreground italic">&ldquo;{quest.note}&rdquo;</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
