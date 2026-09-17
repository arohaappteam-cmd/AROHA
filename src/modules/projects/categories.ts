import type { LifeArea, ProjectCategory } from "@/generated/prisma/enums";

/**
 * Project categories (spec §19). Each maps to the life area its XP feeds and
 * the skill trees it most often trains — suggestions only; the user picks the
 * actual skills a project involves.
 */
export type ProjectCategoryMeta = {
  key: ProjectCategory;
  label: string;
  emoji: string;
  /** An example that shows what counts. */
  example: string;
  lifeArea: LifeArea;
  suggestedTrees: readonly string[];
};

export const PROJECT_CATEGORY_LIST: readonly ProjectCategoryMeta[] = [
  { key: "SOFTWARE", label: "Software", emoji: "💻", example: "Build an application", lifeArea: "LEARNING", suggestedTrees: ["programming"] },
  { key: "WRITING", label: "Writing", emoji: "✍️", example: "Write and publish an article", lifeArea: "CREATIVITY", suggestedTrees: ["writing"] },
  { key: "PHOTOGRAPHY", label: "Photography", emoji: "📷", example: "Create a photography portfolio", lifeArea: "CREATIVITY", suggestedTrees: ["photography"] },
  { key: "MUSIC", label: "Music", emoji: "🎵", example: "Record a song", lifeArea: "CREATIVITY", suggestedTrees: ["music"] },
  { key: "ART", label: "Art", emoji: "🎨", example: "Create a small collection of artwork", lifeArea: "CREATIVITY", suggestedTrees: ["art"] },
  { key: "PRODUCT", label: "Product", emoji: "📦", example: "Build and sell a product", lifeArea: "CAREER", suggestedTrees: ["business", "programming"] },
  { key: "COOKING", label: "Cooking", emoji: "🍳", example: "Cook a five-course dinner for friends", lifeArea: "SKILLS", suggestedTrees: ["cooking"] },
  { key: "FITNESS", label: "Fitness", emoji: "💪", example: "Train for and run a 10k", lifeArea: "PHYSICAL", suggestedTrees: ["fitness"] },
  { key: "LANGUAGE", label: "Language", emoji: "🌍", example: "Hold a 20-minute conversation in Spanish", lifeArea: "LEARNING", suggestedTrees: ["languages"] },
  { key: "COMMUNITY", label: "Community", emoji: "🤝", example: "Organise a local meetup", lifeArea: "SOCIAL", suggestedTrees: ["leadership", "communication"] },
  { key: "OTHER", label: "Something else", emoji: "✨", example: "Anything real you are making", lifeArea: "PERSONAL_DEVELOPMENT", suggestedTrees: [] },
];

export const PROJECT_CATEGORIES = Object.fromEntries(PROJECT_CATEGORY_LIST.map((c) => [c.key, c])) as Record<
  ProjectCategory,
  ProjectCategoryMeta
>;
