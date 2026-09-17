import type { LifeArea } from "@/generated/prisma/enums";

/**
 * Experiment templates (spec §41): low-commitment ways to try something.
 * Each day of an experiment offers one short quest built from `dailyIdeas`.
 */

export type ExperimentTemplate = {
  key: string;
  title: string;
  /** What's being tried, lower case, used in sentences: "trying photography". */
  topic: string;
  description: string;
  emoji: string;
  lifeArea: LifeArea;
  /** Skill tree the practice feeds, when one fits. */
  skillTree: string | null;
  durationDays: number;
  dailyMinutes: number;
  /** Rotated day by day, so the experiment explores rather than repeats. */
  dailyIdeas: readonly string[];
};

export const EXPERIMENT_TEMPLATES: readonly ExperimentTemplate[] = [
  {
    key: "coding-14",
    title: "Try coding for 14 days",
    topic: "coding",
    description: "Twenty-five minutes a day of writing real code, from zero.",
    emoji: "💻",
    lifeArea: "LEARNING",
    skillTree: "programming",
    durationDays: 14,
    dailyMinutes: 25,
    dailyIdeas: [
      "Write a program that prints something about you",
      "Use variables to calculate something from your day",
      "Write an if/else that makes a decision",
      "Use a loop to repeat a task",
      "Write your first function",
      "Fix a bug in something you wrote",
      "Build a tiny tool you'd actually use",
    ],
  },
  {
    key: "photography-7",
    title: "Try photography for 7 days",
    topic: "photography",
    description: "Twenty minutes a day with a camera — a phone counts.",
    emoji: "📷",
    lifeArea: "CREATIVITY",
    skillTree: "photography",
    durationDays: 7,
    dailyMinutes: 20,
    dailyIdeas: [
      "Take 10 photos of one ordinary object from different angles",
      "Shoot only in morning or evening light",
      "Find three leading lines and photograph them",
      "Take a portrait of someone (or yourself) by a window",
      "Photograph a colour you keep noticing",
      "Shoot a small story in five frames",
      "Pick your best three shots of the week and say why",
    ],
  },
  {
    key: "meditation-10",
    title: "Try meditation for 10 days",
    topic: "meditation",
    description: "Ten quiet minutes a day to see what changes.",
    emoji: "🧘",
    lifeArea: "MENTAL",
    skillTree: null,
    durationDays: 10,
    dailyMinutes: 10,
    dailyIdeas: [
      "Sit and follow your breath for 10 minutes",
      "Do a slow body scan from head to toe",
      "Count ten breaths, then start again",
      "Meditate outside and notice every sound",
      "Try a walking meditation",
    ],
  },
  {
    key: "writing-14",
    title: "Try writing for 14 days",
    topic: "writing",
    description: "Twenty minutes a day of putting words down.",
    emoji: "✍️",
    lifeArea: "CREATIVITY",
    skillTree: "writing",
    durationDays: 14,
    dailyMinutes: 20,
    dailyIdeas: [
      "Write 300 words about a place you remember well",
      "Describe a person using only what they do",
      "Write a scene with dialogue only",
      "Rewrite yesterday's piece shorter",
      "Write an opinion you actually hold",
      "Write a letter you won't send",
      "Finish a short piece and read it aloud",
    ],
  },
  {
    key: "entrepreneurship-30",
    title: "Try entrepreneurship for 30 days",
    topic: "entrepreneurship",
    description: "Twenty-five minutes a day testing whether you like building a business.",
    emoji: "📈",
    lifeArea: "CAREER",
    skillTree: "business",
    durationDays: 30,
    dailyMinutes: 25,
    dailyIdeas: [
      "List 10 problems people around you complain about",
      "Talk to one person about a problem they have",
      "Describe one idea in a single sentence",
      "Find three existing products for the same problem",
      "Estimate what someone would pay for your idea",
      "Sketch the simplest version you could sell",
      "Ask one person if they'd pay for it — and listen",
    ],
  },
  {
    key: "music-14",
    title: "Try an instrument for 14 days",
    topic: "music",
    description: "Twenty minutes a day with an instrument or your voice.",
    emoji: "🎵",
    lifeArea: "CREATIVITY",
    skillTree: "music",
    durationDays: 14,
    dailyMinutes: 20,
    dailyIdeas: [
      "Learn to play or sing three notes cleanly",
      "Clap along to a song and find the beat",
      "Learn your first chord or scale",
      "Play a simple melody by ear",
      "Record yourself and listen back once",
      "Learn the first line of a song you love",
    ],
  },
  {
    key: "drawing-7",
    title: "Try drawing for 7 days",
    topic: "drawing",
    description: "Fifteen minutes a day with a pencil and whatever's in front of you.",
    emoji: "🎨",
    lifeArea: "CREATIVITY",
    skillTree: "art",
    durationDays: 7,
    dailyMinutes: 15,
    dailyIdeas: [
      "Draw your hand three times",
      "Draw a cup using only simple shapes",
      "Do five one-minute sketches of people or objects",
      "Draw something using only shading, no outlines",
      "Draw your room from where you sit",
    ],
  },
  {
    key: "running-10",
    title: "Try running for 10 days",
    topic: "running",
    description: "Twenty easy minutes a day — walking breaks welcome.",
    emoji: "🏃",
    lifeArea: "PHYSICAL",
    skillTree: "fitness",
    durationDays: 10,
    dailyMinutes: 20,
    dailyIdeas: [
      "Run for one minute, walk for two, repeat",
      "Run slowly enough to hold a conversation",
      "Try a new route",
      "Run for five minutes without stopping",
      "Finish with five minutes of stretching",
    ],
  },
];

export function findExperimentTemplate(key: string): ExperimentTemplate | undefined {
  return EXPERIMENT_TEMPLATES.find((template) => template.key === key);
}

/** Ideas for a custom experiment, where the topic is the user's own words. */
export function customDailyIdeas(topic: string): string[] {
  return [
    `Spend focused time on ${topic} — just start`,
    `Learn one basic thing about ${topic}`,
    `Practise the part of ${topic} that feels hardest`,
    `Try ${topic} somewhere or somehow new`,
    `Notice what you enjoy most about ${topic}`,
    `Make something small with ${topic} and keep it`,
  ];
}
