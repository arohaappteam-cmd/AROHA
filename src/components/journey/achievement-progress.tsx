import { cn } from "@/lib/utils";
import { RARITY_ORDER, type AchievementRarity } from "@/modules/achievements/catalogue";
import { formatDay } from "@/modules/journey/calendar";
import type { JourneyAchievement } from "@/server/services/journey.service";

import { Meter } from "./hud";
import { Glyph } from "@/components/common/glyph";

/**
 * Rarity is how hard an achievement is to earn, shown by the frame — a
 * heavier frame, then a lit one — rather than by colour alone.
 */
const RARITY_FRAME: Record<AchievementRarity, string> = {
  common: "border-border",
  rare: "border-foreground/30",
  epic: "border-foreground/50 ring-1 ring-foreground/15 ring-offset-2 ring-offset-card",
  legendary: "border-success/70 ring-1 ring-success/30 ring-offset-2 ring-offset-card",
};

const RARITY_LABEL: Record<AchievementRarity, string> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

function AchievementCard({ achievement }: { achievement: JourneyAchievement }) {
  const unlocked = achievement.unlockedOn !== null;
  return (
    <li
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl border bg-background/40 p-4 text-center",
        RARITY_FRAME[achievement.rarity],
        !unlocked && "opacity-70",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-12 rotate-45 place-items-center rounded-lg border",
          unlocked ? (achievement.rarity === "legendary" ? "glow-success border-success/60 bg-success/15" : "border-foreground/30 bg-muted") : "border-dashed bg-transparent",
        )}
      >
        <span className={cn("-rotate-45 text-2xl", !unlocked && "grayscale")}><Glyph emoji={achievement.emoji} /></span>
      </span>
      <p className="mt-1 text-sm leading-tight font-medium text-balance">{achievement.name}</p>
      <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{RARITY_LABEL[achievement.rarity]}</p>
      {unlocked ? (
        <p className="mt-auto font-mono text-[11px] text-success">
          Unlocked {formatDay(achievement.unlockedOn!, "dayMonth")}
          <span className="text-muted-foreground"> · +{achievement.xpReward} XP</span>
        </p>
      ) : achievement.progress ? (
        <div className="mt-auto w-full space-y-1">
          <Meter percent={(achievement.progress.current / achievement.progress.target) * 100} label={`${achievement.name} progress`} size="sm" tone="muted" />
          <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {achievement.progress.current} / {achievement.progress.target}
          </p>
        </div>
      ) : (
        <p className="mt-auto text-[11px] text-pretty text-muted-foreground">{achievement.hint}</p>
      )}
    </li>
  );
}

/** Unlocked first (newest first), then the closest to unlocking. */
export function AchievementProgress({ achievements }: { achievements: JourneyAchievement[] }) {
  const closeness = (entry: JourneyAchievement) => (entry.progress ? entry.progress.current / entry.progress.target : 0);
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlockedOn && b.unlockedOn) return b.unlockedOn.localeCompare(a.unlockedOn);
    if (a.unlockedOn || b.unlockedOn) return a.unlockedOn ? -1 : 1;
    return closeness(b) - closeness(a) || RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
  });
  const unlocked = achievements.filter((entry) => entry.unlockedOn).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Meter percent={(unlocked / Math.max(1, achievements.length)) * 100} label="Achievements unlocked" className="max-w-xs flex-1" />
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {unlocked} / {achievements.length} unlocked
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((achievement) => (
          <AchievementCard key={achievement.slug} achievement={achievement} />
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Checked automatically from what you actually do — and never taken away once earned.</p>
    </div>
  );
}
