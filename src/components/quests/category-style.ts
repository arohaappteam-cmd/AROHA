import type { LifeArea } from "@/generated/prisma/enums";

export type CategoryStyle = {
  /** Accent text colour. */
  text: string;
  /** Soft tinted background. */
  soft: string;
  /** Border / ring accent. */
  border: string;
  /** Solid fill for nodes and progress. */
  solid: string;
  /** Top-left glow on cards. */
  glow: string;
};

// Full literal class strings so Tailwind can see them.
const STYLES: Partial<Record<LifeArea, CategoryStyle>> = {
  PHYSICAL: {
    text: "text-orange-600 dark:text-orange-300",
    soft: "bg-orange-500/12",
    border: "border-orange-500/40",
    solid: "bg-orange-500",
    glow: "bg-[radial-gradient(ellipse_at_top_left,oklch(0.7_0.18_45/0.22),transparent_60%)]",
  },
  MENTAL: {
    text: "text-sky-600 dark:text-sky-300",
    soft: "bg-sky-500/12",
    border: "border-sky-500/40",
    solid: "bg-sky-500",
    glow: "bg-[radial-gradient(ellipse_at_top_left,oklch(0.72_0.13_230/0.22),transparent_60%)]",
  },
  LEARNING: {
    text: "text-amber-600 dark:text-amber-300",
    soft: "bg-amber-500/12",
    border: "border-amber-500/40",
    solid: "bg-amber-500",
    glow: "bg-[radial-gradient(ellipse_at_top_left,oklch(0.8_0.15_80/0.2),transparent_60%)]",
  },
  SOCIAL: {
    text: "text-rose-600 dark:text-rose-300",
    soft: "bg-rose-500/12",
    border: "border-rose-500/40",
    solid: "bg-rose-500",
    glow: "bg-[radial-gradient(ellipse_at_top_left,oklch(0.7_0.18_10/0.22),transparent_60%)]",
  },
  PERSONAL_GOAL: {
    text: "text-violet-600 dark:text-violet-300",
    soft: "bg-violet-500/12",
    border: "border-violet-500/40",
    solid: "bg-violet-500",
    glow: "bg-[radial-gradient(ellipse_at_top_left,oklch(0.65_0.2_290/0.25),transparent_60%)]",
  },
  CREATIVITY: {
    text: "text-fuchsia-600 dark:text-fuchsia-300",
    soft: "bg-fuchsia-500/12",
    border: "border-fuchsia-500/40",
    solid: "bg-fuchsia-500",
    glow: "bg-[radial-gradient(ellipse_at_top_left,oklch(0.7_0.2_330/0.22),transparent_60%)]",
  },
  EXPERIENCES: {
    text: "text-emerald-600 dark:text-emerald-300",
    soft: "bg-emerald-500/12",
    border: "border-emerald-500/40",
    solid: "bg-emerald-500",
    glow: "bg-[radial-gradient(ellipse_at_top_left,oklch(0.72_0.15_160/0.22),transparent_60%)]",
  },
};

export function categoryStyle(lifeArea: LifeArea): CategoryStyle {
  return STYLES[lifeArea] ?? STYLES.PERSONAL_GOAL!;
}
