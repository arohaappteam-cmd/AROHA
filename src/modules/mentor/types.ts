import type { LifeArea } from "@/generated/prisma/enums";

/**
 * Everything the AI Mentor reasons over, assembled by the backend and passed
 * to the model as data (never as instructions). Deterministic fallbacks read
 * the same shape, so the mentor behaves the same with or without AI.
 */
export type MentorContext = {
  user: { name: string; timezone: string };
  preferences: {
    dailyMinutes: number;
    challengeLevel: string;
    movementOptions: string[];
    learningFormats: string[];
  };
  interests: string[];
  focusAreas: LifeArea[];
  progression: {
    level: number;
    tier: string;
    totalXp: number;
    attributes: { attribute: string; total: number }[];
  };
  majorGoal: MentorGoal | null;
  goals: MentorGoal[];
  quests: {
    today: { completed: number; total: number };
    last7Days: { completed: number; total: number };
    byArea: { lifeArea: LifeArea; completed: number; total: number }[];
    /** Areas with quests but nothing completed in the last 7 days. */
    neglectedAreas: LifeArea[];
    /** Areas with the strongest recent completion. */
    strongAreas: LifeArea[];
    recentReflections: { date: string; lifeArea: LifeArea; note: string }[];
    /** Skip reasons seen in the last 7 days, most common first. */
    commonSkipReasons: string[];
  };
};

export type MentorGoal = {
  id: string;
  title: string;
  lifeArea: LifeArea;
  status: string;
  percent: number;
  milestoneCount: number;
  nextStep: string | null;
};

// ─── Insight outputs (AI or fallback) ───────────────────────────────────────

export type MentorRecommendation = {
  title: string;
  detail: string;
  /** Optional in-app destination. */
  href: string | null;
  actionLabel: string | null;
};

export type MentorSkillGap = {
  label: string;
  detail: string;
};

export type MentorInsights = {
  /** One warm, specific sentence for the top of the page. */
  headline: string;
  analysis: {
    summary: string;
    wins: string[];
    watchOuts: string[];
  };
  recommendations: MentorRecommendation[];
  skillGaps: MentorSkillGap[];
  /** Guidance on the major goal, or null when there's no active goal. */
  goalGuidance: { goalId: string; guidance: string; nextActions: string[] } | null;
};

export type DiscoveryLesson = {
  title: string;
  minutes: number;
  hook: string;
  sections: { heading: string; body: string }[];
  keyIdea: string;
  reflectionPrompt: string;
  tags: string[];
};
