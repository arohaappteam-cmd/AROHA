/**
 * The built-in achievement catalogue (spec §17). Every achievement carries a
 * pure, deterministic rule over observable facts — nothing is unlocked by
 * hand, by AI, or by chance. Once unlocked, an achievement is part of the
 * user's history and is never taken away.
 */

/** Everything achievement rules are allowed to look at. All backend-derived. */
export type AchievementFacts = {
  questsCompleted: number;
  /** Completed projects — each one carries evidence by rule. */
  projectsCompleted: number;
  /** A practical task or project assessment has been passed. */
  abilityDemonstrated: boolean;
  /** Completed real reading sessions. */
  readingQuestsCompleted: number;
  goalsCompleted: number;
  /** Longest window (in days) among completed challenges; 0 when none. */
  longestChallengeCompleted: number;
  /** Highest level reached across all skills. */
  maxSkillLevel: number;
  /** A skill reached its final level AND ability was demonstrated in it. */
  hasMasteredSkill: boolean;
  /** Experiments taken to the end and reviewed. */
  experimentsReviewed: number;
  /** Days with an end-of-day reflection. */
  reflectionDays: number;
};

export const EMPTY_FACTS: AchievementFacts = {
  questsCompleted: 0,
  projectsCompleted: 0,
  abilityDemonstrated: false,
  readingQuestsCompleted: 0,
  goalsCompleted: 0,
  longestChallengeCompleted: 0,
  maxSkillLevel: 0,
  hasMasteredSkill: false,
  experimentsReviewed: 0,
  reflectionDays: 0,
};

export type AchievementSpec = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  /** How to earn it — shown while still locked. */
  hint: string;
  xpReward: number;
  earned: (facts: AchievementFacts) => boolean;
};

export const ACHIEVEMENTS: readonly AchievementSpec[] = [
  {
    slug: "first-quest",
    name: "First Quest",
    description: "You completed your first quest. Every journey starts exactly like this.",
    emoji: "🌅",
    hint: "Complete any quest.",
    xpReward: 25,
    earned: (facts) => facts.questsCompleted >= 1,
  },
  {
    slug: "quests-25",
    name: "25 Quests Completed",
    description: "Twenty-five real actions, recorded and earned.",
    emoji: "📜",
    hint: "Complete 25 quests.",
    xpReward: 50,
    earned: (facts) => facts.questsCompleted >= 25,
  },
  {
    slug: "quests-100",
    name: "100 Quests Completed",
    description: "A hundred completed quests. This is who you are now.",
    emoji: "🏛️",
    hint: "Complete 100 quests.",
    xpReward: 150,
    earned: (facts) => facts.questsCompleted >= 100,
  },
  {
    slug: "first-project",
    name: "First Project",
    description: "You finished a real project and showed the evidence. Made beats claimed.",
    emoji: "🛠️",
    hint: "Complete a project with evidence attached.",
    xpReward: 50,
    earned: (facts) => facts.projectsCompleted >= 1,
  },
  {
    slug: "builder",
    name: "Builder",
    description: "Three finished projects. Making things is part of who you are.",
    emoji: "🏗️",
    hint: "Complete 3 projects.",
    xpReward: 100,
    earned: (facts) => facts.projectsCompleted >= 3,
  },
  {
    slug: "proof-over-claims",
    name: "Proof Over Claims",
    description: "You passed a practical task or project review — ability shown, not just said.",
    emoji: "🔎",
    hint: "Pass a practical task or project assessment.",
    xpReward: 50,
    earned: (facts) => facts.abilityDemonstrated,
  },
  {
    slug: "curious-mind",
    name: "Curious Mind",
    description: "You tried something new, saw it through, and asked yourself honestly how it went.",
    emoji: "🧪",
    hint: "Finish an experiment and answer its review.",
    xpReward: 50,
    earned: (facts) => facts.experimentsReviewed >= 1,
  },
  {
    slug: "reflective-week",
    name: "Seven Reflections",
    description: "Seven days you stopped to ask what the day taught you.",
    emoji: "🪞",
    hint: "Write an end-of-day reflection on 7 different days.",
    xpReward: 50,
    earned: (facts) => facts.reflectionDays >= 7,
  },
  {
    slug: "first-book",
    name: "First Book Completed",
    description: "Ten real reading sessions — about a book's worth of pages.",
    emoji: "📚",
    hint: "Complete 10 reading quests.",
    xpReward: 50,
    earned: (facts) => facts.readingQuestsCompleted >= 10,
  },
  {
    slug: "challenge-7",
    name: "7-Day Challenge",
    description: "You saw a week-long challenge through to the end.",
    emoji: "🔥",
    hint: "Complete any challenge of 7 days or longer.",
    xpReward: 50,
    earned: (facts) => facts.longestChallengeCompleted >= 7,
  },
  {
    slug: "challenge-30",
    name: "30-Day Challenge",
    description: "A full month of showing up for one commitment.",
    emoji: "🌋",
    hint: "Complete a 30-day challenge.",
    xpReward: 150,
    earned: (facts) => facts.longestChallengeCompleted >= 30,
  },
  {
    slug: "first-major-goal",
    name: "First Major Goal",
    description: "You set a real goal, walked its roadmap, and finished it.",
    emoji: "🏔️",
    hint: "Complete a goal.",
    xpReward: 100,
    earned: (facts) => facts.goalsCompleted >= 1,
  },
  {
    slug: "skill-milestone",
    name: "Skill Milestone",
    description: "A skill reached level 3 — past dabbling, into real ability.",
    emoji: "⚡",
    hint: "Raise any skill to level 3.",
    xpReward: 50,
    earned: (facts) => facts.maxSkillLevel >= 3,
  },
  {
    slug: "skill-mastery",
    name: "Skill Mastery",
    description: "You took a skill to its final level and proved it in an assessed task.",
    emoji: "👑",
    hint: "Reach a skill's top level and pass a practical or project assessment in it.",
    xpReward: 150,
    earned: (facts) => facts.hasMasteredSkill,
  },
];

/** A fresh unlock, shaped for the completion toast and celebration UI. */
export type UnlockedAchievement = {
  slug: string;
  name: string;
  emoji: string;
  xpReward: number;
};

export function findAchievement(slug: string): AchievementSpec | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.slug === slug);
}

/** Slugs earned under `facts` — the whole rule engine, pure and testable. */
export function earnedAchievements(facts: AchievementFacts): AchievementSpec[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.earned(facts));
}
