import type { LifeArea } from "@/generated/prisma/enums";

/**
 * The built-in challenge templates (spec §11). A challenge is a temporary
 * commitment with a window; days are earned only by completing matching
 * quests, so a challenge is always backed by real action.
 */

export type ChallengeTemplate = {
  key: string;
  title: string;
  description: string;
  emoji: string;
  lifeArea: LifeArea;
  /** Window length in calendar days. */
  durationDays: number;
  /**
   * Which completed quests earn a day: by base template key, by life area,
   * or by the skill tree the quest trained (reusing the skill matcher).
   */
  match: { templateKeys?: readonly string[]; lifeAreas?: readonly LifeArea[]; skillTrees?: readonly string[] };
};

export const CHALLENGE_TEMPLATES: readonly ChallengeTemplate[] = [
  {
    key: "reading-7",
    title: "7-Day Reading",
    description: "A real reading session most days for a week.",
    emoji: "📖",
    lifeArea: "LEARNING",
    durationDays: 7,
    match: { templateKeys: ["learning.reading"] },
  },
  {
    key: "fitness-30",
    title: "30-Day Fitness",
    description: "A month of moving your body, most days.",
    emoji: "💪",
    lifeArea: "PHYSICAL",
    durationDays: 30,
    match: { lifeAreas: ["PHYSICAL"] },
  },
  {
    key: "coding-14",
    title: "14-Day Coding",
    description: "Two weeks of real programming work, most days.",
    emoji: "💻",
    lifeArea: "LEARNING",
    durationDays: 14,
    match: { skillTrees: ["programming"] },
  },
  {
    key: "meditation-21",
    title: "21-Day Meditation",
    description: "Three weeks of making space to be still.",
    emoji: "🧘",
    lifeArea: "MENTAL",
    durationDays: 21,
    match: { templateKeys: ["mental.meditation", "mental.breathing", "mental.mindful-walk"] },
  },
  {
    key: "digital-break-7",
    title: "7-Day Digital Break",
    description: "A week of deliberate time away from screens.",
    emoji: "🌿",
    lifeArea: "MENTAL",
    durationDays: 7,
    match: { templateKeys: ["mental.digital-break", "social.phone-free-time"] },
  },
  {
    key: "create-48h",
    title: "Build Something in 48 Hours",
    description: "Two back-to-back days of making — finish something small.",
    emoji: "🛠️",
    lifeArea: "CREATIVITY",
    durationDays: 2,
    match: { lifeAreas: ["CREATIVITY"], skillTrees: ["art", "music", "writing", "photography", "programming"] },
  },
];

export function findChallengeTemplate(key: string): ChallengeTemplate | undefined {
  return CHALLENGE_TEMPLATES.find((template) => template.key === key);
}
