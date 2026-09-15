import { LESSON_LIBRARY } from "./lessons";
import { weightedPick } from "./random";

/**
 * Learning experiences delivered inside AROHA (spec §3 "AI Learning
 * Fallback"). A provider suggests a lesson for today and returns its content
 * when the user opens the quest.
 *
 * Today the only provider is the curated library below. The AI Mentor will
 * implement the same interface, generating lessons personalised to interests,
 * existing knowledge and learning history, stored with provider "mentor".
 */

export type LearningExperience = {
  id: string;
  provider: "library" | "mentor";
  title: string;
  minutes: number;
  /** One-sentence hook shown on the quest card. */
  hook: string;
  sections: { heading: string; body: string }[];
  keyIdea: string;
  reflectionPrompt: string;
  /** Interest keywords this lesson suits. */
  tags: string[];
};

export type LessonSuggestionInput = {
  interests: string[];
  /** Lesson ids used recently; they are avoided while alternatives exist. */
  recentLessonIds: string[];
  rng: () => number;
};

export interface LearningExperienceProvider {
  readonly name: "library" | "mentor";
  suggest(input: LessonSuggestionInput): LearningExperience | null;
  get(lessonId: string): LearningExperience | null;
}

function interestScore(lesson: LearningExperience, interests: string[]): number {
  const words = interests.flatMap((interest) => interest.toLowerCase().split(/[^\p{L}\p{N}]+/u)).filter((w) => w.length > 2);
  return lesson.tags.filter((tag) => words.some((word) => tag.includes(word) || word.includes(tag))).length;
}

export const libraryLearningProvider: LearningExperienceProvider = {
  name: "library",
  suggest({ interests, recentLessonIds, rng }) {
    const fresh = LESSON_LIBRARY.filter((lesson) => !recentLessonIds.includes(lesson.id));
    const pool = fresh.length > 0 ? fresh : LESSON_LIBRARY;
    // Lessons matching the user's interests are three times as likely per match.
    return weightedPick(pool, (lesson) => 1 + 3 * interestScore(lesson, interests), rng);
  },
  get(lessonId) {
    return LESSON_LIBRARY.find((lesson) => lesson.id === lessonId) ?? null;
  },
};

export function getLearningExperience(provider: "library" | "mentor", lessonId: string): LearningExperience | null {
  // Mentor lessons don't exist yet; when they do, resolve them here.
  return provider === "library" ? libraryLearningProvider.get(lessonId) : null;
}
