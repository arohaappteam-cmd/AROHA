import type { LifeArea } from "@/generated/prisma/enums";

export type LifeAreaMeta = {
  key: LifeArea;
  label: string;
  emoji: string;
  description: string;
  /** Part of every balanced day (spec §3); always active. */
  core: boolean;
};

export const MAX_FOCUS_AREAS = 3;
export const MAX_INTENTION_LENGTH = 140;

/** All life areas in display order (spec §22). */
export const LIFE_AREA_LIST: readonly LifeAreaMeta[] = [
  { key: "PHYSICAL", label: "Physical", emoji: "💪", core: true, description: "Movement, fitness, strength and energy." },
  { key: "MENTAL", label: "Mental", emoji: "🧠", core: true, description: "Calm, clarity, focus and emotional balance." },
  { key: "LEARNING", label: "Learning", emoji: "📚", core: true, description: "Curiosity, knowledge and new ideas." },
  { key: "SOCIAL", label: "Social", emoji: "🤝", core: true, description: "Human connection, conversation and community." },
  { key: "PERSONAL_GOAL", label: "Personal Goals", emoji: "🎯", core: true, description: "Daily steps toward the things you most want." },
  { key: "CREATIVITY", label: "Creativity", emoji: "🎨", core: false, description: "Making, designing, writing, music and art." },
  { key: "EXPERIENCES", label: "Experiences", emoji: "🌎", core: false, description: "New places, activities and adventures." },
  { key: "CAREER", label: "Career", emoji: "💼", core: false, description: "Work, craft, professional growth and impact." },
  { key: "FINANCE", label: "Financial", emoji: "💰", core: false, description: "Money skills, stability and independence." },
  { key: "SKILLS", label: "Skills", emoji: "🛠️", core: false, description: "Practical abilities you build through practice." },
  { key: "RELATIONSHIPS", label: "Relationships", emoji: "❤️", core: false, description: "Family, partners and close friendships." },
  { key: "PERSONAL_DEVELOPMENT", label: "Personal Development", emoji: "🌱", core: false, description: "Habits, discipline, character and self-awareness." },
];

export const LIFE_AREAS = Object.fromEntries(
  LIFE_AREA_LIST.map((area) => [area.key, area]),
) as Record<LifeArea, LifeAreaMeta>;

/** The five categories every balanced day draws from (spec §3). */
export const CORE_DAILY_LIFE_AREAS = LIFE_AREA_LIST.filter((a) => a.core).map(
  (a) => a.key,
);

export type StoredLifeArea = {
  lifeArea: LifeArea;
  isActive: boolean;
  isFocus: boolean;
  focusRank: number | null;
  intention: string | null;
};

export type ResolvedLifeArea = LifeAreaMeta & {
  isActive: boolean;
  isFocus: boolean;
  focusRank: number | null;
  intention: string | null;
};

/**
 * Combines stored rows with the catalogue. Core areas are always active;
 * areas without a row are inactive. Focus only counts on active areas.
 */
export function resolveLifeAreas(
  rows: readonly StoredLifeArea[],
): ResolvedLifeArea[] {
  const byKey = new Map(rows.map((row) => [row.lifeArea, row]));

  return LIFE_AREA_LIST.map((meta) => {
    const row = byKey.get(meta.key);
    const isActive = meta.core || (row?.isActive ?? false);
    const isFocus = isActive && (row?.isFocus ?? false);
    return {
      ...meta,
      isActive,
      isFocus,
      focusRank: isFocus ? (row?.focusRank ?? null) : null,
      intention: row?.intention ?? null,
    };
  });
}

/** Focus areas ordered by rank (unranked last, then catalogue order). */
export function focusAreas<T extends ResolvedLifeArea>(areas: readonly T[]): T[] {
  return areas
    .filter((area) => area.isFocus)
    .sort(
      (a, b) =>
        (a.focusRank ?? Number.MAX_SAFE_INTEGER) -
        (b.focusRank ?? Number.MAX_SAFE_INTEGER),
    );
}
