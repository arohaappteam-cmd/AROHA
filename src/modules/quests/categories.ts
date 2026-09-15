import type { LifeArea } from "@/generated/prisma/enums";

/** The five slots every day is built from (spec §3), in journey order. */
export const CORE_SLOTS = ["PHYSICAL", "MENTAL", "LEARNING", "SOCIAL", "PERSONAL_GOAL"] as const;
export type CoreSlot = (typeof CORE_SLOTS)[number];

/** Optional extra quest, offered for a creative or exploratory focus area. */
export const BONUS_SLOT = "BONUS" as const;
export type QuestSlot = CoreSlot | typeof BONUS_SLOT;

export const BONUS_LIFE_AREAS = ["CREATIVITY", "EXPERIENCES"] as const satisfies readonly LifeArea[];

export type QuestCategoryMeta = {
  lifeArea: LifeArea;
  label: string;
  /** One-word verb from the AROHA loop: Move → Think → Learn → Connect … */
  verb: string;
  emoji: string;
  tagline: string;
};

export const QUEST_CATEGORIES: Record<CoreSlot | (typeof BONUS_LIFE_AREAS)[number], QuestCategoryMeta> = {
  PHYSICAL: { lifeArea: "PHYSICAL", label: "Physical", verb: "Move", emoji: "💪", tagline: "Strength, energy and a body that carries you." },
  MENTAL: { lifeArea: "MENTAL", label: "Mental", verb: "Think", emoji: "🧠", tagline: "Clarity, calm and room to breathe." },
  LEARNING: { lifeArea: "LEARNING", label: "Learning", verb: "Learn", emoji: "📚", tagline: "Something new, every single day." },
  SOCIAL: { lifeArea: "SOCIAL", label: "Social", verb: "Connect", emoji: "🤝", tagline: "Real people, real conversations." },
  PERSONAL_GOAL: { lifeArea: "PERSONAL_GOAL", label: "Personal Goal", verb: "Advance", emoji: "🎯", tagline: "One real step toward what you want most." },
  CREATIVITY: { lifeArea: "CREATIVITY", label: "Creativity", verb: "Create", emoji: "🎨", tagline: "Make something that didn't exist this morning." },
  EXPERIENCES: { lifeArea: "EXPERIENCES", label: "Experiences", verb: "Explore", emoji: "🌎", tagline: "Life happens outside the app." },
};

export function categoryFor(lifeArea: LifeArea): QuestCategoryMeta {
  return (QUEST_CATEGORIES as Record<string, QuestCategoryMeta>)[lifeArea] ?? QUEST_CATEGORIES.PERSONAL_GOAL;
}

/** Share of the user's daily time budget given to each core slot. */
export const SLOT_TIME_SHARE: Record<CoreSlot, number> = {
  PHYSICAL: 0.3,
  PERSONAL_GOAL: 0.3,
  LEARNING: 0.2,
  MENTAL: 0.1,
  SOCIAL: 0.1,
};
