import type { SkillStatus } from "@/modules/skills/state";

/** Shared look for the four skill states, full literal classes for Tailwind. */
export type SkillStatusMeta = {
  label: string;
  /** What the state means, in the user's language. */
  hint: string;
  text: string;
  badge: string;
  dot: string;
};

export const SKILL_STATUS_META: Record<SkillStatus, SkillStatusMeta> = {
  MASTERED: {
    label: "Mastered",
    hint: "What you know",
    text: "text-emerald-600 dark:text-emerald-300",
    badge: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  IN_PROGRESS: {
    label: "Learning",
    hint: "What you're learning",
    text: "text-violet-600 dark:text-violet-300",
    badge: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  AVAILABLE: {
    label: "Ready to start",
    hint: "What you can unlock next",
    text: "text-amber-600 dark:text-amber-300",
    badge: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  LOCKED: {
    label: "Locked",
    hint: "Further ahead",
    text: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
};
