import { Clock3Icon, SparklesIcon } from "lucide-react";

import type { QuestDifficulty } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const DIFFICULTY_LEVEL: Record<QuestDifficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
const DIFFICULTY_LABEL: Record<QuestDifficulty, string> = { EASY: "Easy", MEDIUM: "Moderate", HARD: "Challenging" };

export function DifficultyPips({ difficulty, className }: { difficulty: QuestDifficulty; className?: string }) {
  const level = DIFFICULTY_LEVEL[difficulty];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={`${DIFFICULTY_LABEL[difficulty]} difficulty`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((pip) => (
          <span key={pip} className={cn("h-2.5 w-1 rounded-full", pip <= level ? "bg-current" : "bg-current opacity-20")} />
        ))}
      </span>
      <span>{DIFFICULTY_LABEL[difficulty]}</span>
    </span>
  );
}

export function QuestMeta({
  difficulty,
  minutes,
  xp,
  xpAwarded,
  className,
}: {
  difficulty: QuestDifficulty;
  minutes: number | null;
  xp: number;
  xpAwarded: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      <DifficultyPips difficulty={difficulty} />
      {minutes !== null && (
        <span className="inline-flex items-center gap-1">
          <Clock3Icon className="size-3.5" aria-hidden />
          {minutes} min
        </span>
      )}
      <span
        className="inline-flex items-center gap-1 font-medium text-xp"
        title={xpAwarded ? "XP reward" : "XP is recorded now and awarded when character progression launches"}
      >
        <SparklesIcon className="size-3.5" aria-hidden />+{xp} XP
      </span>
    </div>
  );
}

/** Circular day progress. */
export function ProgressRing({
  value,
  total,
  size = 112,
  label,
}: {
  value: number;
  total: number;
  size?: number;
  label: string;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? value / total : 0;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="stroke-success transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center" role="img" aria-label={label}>
        <div>
          <p className="text-3xl leading-none font-semibold tabular-nums">
            {value}
            <span className="text-lg text-muted-foreground">/{total}</span>
          </p>
          <p className="mt-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">quests</p>
        </div>
      </div>
    </div>
  );
}
