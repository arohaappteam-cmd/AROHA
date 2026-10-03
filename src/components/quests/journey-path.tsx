import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { categoryFor } from "@/modules/quests/categories";
import type { QuestView } from "@/server/services/quest-view.service";

import { categoryStyle } from "./category-style";
import { QuestCard } from "./quest-card";
import { Glyph } from "@/components/common/glyph";

/**
 * Today's quests as stages of a journey: a path of nodes, one per category,
 * each leading to its quest.
 */
export function JourneyPath({ quests, xpAwarded }: { quests: QuestView[]; xpAwarded: boolean }) {
  return (
    <ol className="relative space-y-4" aria-label="Today's quests">
      {quests.map((quest, index) => {
        const style = categoryStyle(quest.lifeArea);
        const category = categoryFor(quest.lifeArea);
        const done = quest.status === "COMPLETED";
        const isLast = index === quests.length - 1;
        return (
          <li key={quest.id} className="relative flex gap-3 sm:gap-5">
            {!isLast && (
              <span
                aria-hidden
                className={cn("absolute top-12 bottom-[-1rem] left-[1.4375rem] w-0.5 sm:left-[1.6875rem]", done ? "bg-emerald-500/50" : "bg-border")}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-1 grid size-12 shrink-0 place-items-center rounded-full border-2 text-2xl sm:size-14",
                done ? "border-emerald-500 bg-emerald-500/15" : cn(style.border, style.soft),
              )}
            >
              {done ? <CheckIcon className="size-6 text-emerald-500" /> : <Glyph emoji={category.emoji} />}
            </span>
            <div className="min-w-0 flex-1">
              <QuestCard quest={quest} xpAwarded={xpAwarded} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
