import { LockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AchievementView } from "@/server/services/achievement.service";

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

/** The full achievement catalogue: earned ones shine, locked ones show the way. */
export function AchievementGrid({ achievements }: { achievements: AchievementView[] }) {
  const unlocked = achievements.filter((achievement) => achievement.unlockedAt !== null);
  const locked = achievements.filter((achievement) => achievement.unlockedAt === null);

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...unlocked, ...locked].map((achievement) => {
        const earned = achievement.unlockedAt !== null;
        return (
          <li
            key={achievement.slug}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              earned ? "border-amber-500/40 bg-amber-500/5" : "border-dashed opacity-75",
            )}
          >
            <span className={cn("text-2xl", !earned && "grayscale")} aria-hidden>
              {earned ? achievement.emoji : <LockIcon className="mt-1 size-5 text-muted-foreground" />}
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">{achievement.name}</p>
              <p className="text-xs text-muted-foreground">{earned ? achievement.description : achievement.hint}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {earned
                  ? `Unlocked ${dateFormat.format(new Date(achievement.unlockedAt!))}`
                  : achievement.xpReward > 0
                    ? `+${achievement.xpReward} XP`
                    : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
