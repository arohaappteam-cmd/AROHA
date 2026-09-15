import type { LifeArea } from "@/generated/prisma/enums";

export const MAX_INTERESTS = 30;
export const MIN_INTEREST_LENGTH = 2;
export const MAX_INTEREST_LENGTH = 40;

/** Collapses case, whitespace and punctuation so "Rock climbing" == "rock-climbing". */
export function interestSlug(label: string): string {
  return label
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function cleanInterestLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

/**
 * Starting points for people from any walk of life. Users can add anything;
 * these only make the first few picks effortless.
 */
export const INTEREST_SUGGESTIONS: Record<LifeArea, readonly string[]> = {
  PHYSICAL: ["Strength training", "Running", "Yoga", "Hiking", "Swimming", "Cycling", "Martial arts", "Dance"],
  MENTAL: ["Meditation", "Journaling", "Mindfulness", "Breathwork", "Better sleep"],
  LEARNING: ["Psychology", "History", "Science", "Philosophy", "Languages", "Economics", "Space"],
  SOCIAL: ["Volunteering", "Community events", "Board games", "Hosting friends"],
  PERSONAL_GOAL: ["Building something", "Getting fit", "Writing a book", "Learning an instrument"],
  CREATIVITY: ["Photography", "Music", "Writing", "Drawing", "Design", "Cooking", "Film"],
  EXPERIENCES: ["Travel", "Nature", "Food", "Live music", "Camping"],
  CAREER: ["Leadership", "Entrepreneurship", "Public speaking", "Programming", "Marketing", "Management"],
  FINANCE: ["Budgeting", "Investing basics", "Side income", "Saving"],
  SKILLS: ["Gardening", "Woodworking", "Home repair", "Negotiation", "First aid"],
  RELATIONSHIPS: ["Family time", "Parenting", "Friendship", "Communication"],
  PERSONAL_DEVELOPMENT: ["Habits", "Discipline", "Productivity", "Confidence", "Stoicism"],
};
