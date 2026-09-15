import type { LifeArea } from "@/generated/prisma/enums";

import {
  roadmapDraftSchema,
  type GeneratedRoadmap,
  type RoadmapContext,
  type RoadmapGenerator,
} from "./roadmap";

/**
 * Rule-based roadmap generation. Used until the AI Mentor is connected, and
 * as an offline fallback afterwards. Deterministic: same context, same draft.
 */

const GENERATOR_VERSION = "rule-based@1";

type MissionSpec = string | { title: string; description: string };
type MilestoneSpec = {
  title: string;
  description?: string;
  missions: MissionSpec[];
  /** Foundations get skipped for experienced users. */
  foundational?: boolean;
};
type Template = {
  key: string;
  match: RegExp;
  build: (ctx: RoadmapContext, subject: string) => MilestoneSpec[];
};

const INSTRUMENTS = ["guitar", "piano", "ukulele", "drums", "violin", "bass", "cello", "saxophone", "flute", "singing", "voice"];
const LANGUAGES = [
  "spanish", "french", "german", "italian", "portuguese", "japanese", "korean", "mandarin", "chinese",
  "arabic", "hindi", "russian", "turkish", "dutch", "swahili", "tamil", "telugu", "english",
];

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function findWord(text: string, words: readonly string[]): string | null {
  return words.find((word) => new RegExp(`\\b${word}\\b`, "i").test(text)) ?? null;
}

const TEMPLATES: Template[] = [
  {
    key: "programming",
    match: /\b(program(ming)?|coding|code|coder|developer|software|python|javascript|typescript|web ?dev|apps?|website)\b/i,
    build: (_ctx, text) => {
      const web = /\b(javascript|typescript|web|website|frontend|react|apps?)\b/i.test(text);
      const language = web ? "JavaScript" : "Python";
      return [
        {
          title: "Fundamentals",
          description: "The building blocks every program is made of.",
          foundational: true,
          missions: ["Learn variables and data types", "Practice loops and conditionals", "Write your first functions"],
        },
        {
          title: language,
          description: `Get comfortable writing real ${language}.`,
          missions: [
            `Set up ${language} on your computer`,
            web ? "Work with arrays and objects" : "Work with lists and dictionaries",
            web ? "Make a web page respond to a click" : "Read and write files",
          ],
        },
        {
          title: "Problem Solving",
          description: "Turn a vague problem into working code.",
          missions: ["Solve 5 beginner exercises", "Break a problem into steps before coding", "Debug a broken program"],
        },
        {
          title: "Projects",
          description: "Build things — proof beats tutorials.",
          missions: ["Build a calculator", "Build a small tool you'd actually use", "Build and share your first project"],
        },
      ];
    },
  },
  {
    key: "running",
    match: /\b(run|running|runner|jog|jogging|marathon|half[- ]marathon|5 ?k|10 ?k)\b/i,
    build: (ctx) => [
      {
        title: "Build the habit",
        description: "Easy, regular movement before speed or distance.",
        foundational: true,
        missions: ["Walk-run for 20 minutes, three times", "Get comfortable running shoes", "Find a safe, repeatable route"],
      },
      {
        title: "Build your base",
        description: "Run a little further, a little more often.",
        missions: ["Run 20 minutes without stopping", "Complete a full week of planned runs", "Add a gentle long run each week"],
      },
      {
        title: "Get stronger",
        missions: ["Add two short strength sessions", "Try one easy interval session", "Run your longest distance so far"],
      },
      {
        title: "Race ready",
        description: ctx.target ? `Work up to: ${ctx.target}` : "Put your training to the test.",
        missions: ["Do a practice run at target distance", "Plan rest before the big day", ctx.target ? `Achieve it: ${ctx.target}` : "Complete your target run"],
      },
    ],
  },
  {
    key: "strength",
    match: /\b(strength|stronger|gym|lift(ing)?|muscle|fit(ness)?|fitter|workout|exercise|weight|push-?ups?|pull-?ups?)\b/i,
    build: (ctx) => [
      {
        title: "Learn the movements",
        description: "Safe form first. Strength follows.",
        foundational: true,
        missions: ["Learn squat, push, pull and hinge basics", "Choose a simple routine that fits your space", "Complete your first full session"],
      },
      {
        title: "Consistency",
        missions: ["Train three times in one week", "Log your sessions for two weeks", "Keep going through one hard week"],
      },
      {
        title: "Progress",
        description: "Small, steady increases.",
        missions: ["Increase reps or load on each movement", "Add one new exercise", "Re-test where you started"],
      },
      {
        title: "Own it",
        description: ctx.target ? `Reach: ${ctx.target}` : "Make it part of who you are.",
        missions: ["Design your own weekly plan", ctx.target ? `Hit your target: ${ctx.target}` : "Hit a personal best"],
      },
    ],
  },
  {
    key: "instrument",
    match: new RegExp(`\\b(${INSTRUMENTS.join("|")}|instrument|music)\\b`, "i"),
    build: (_ctx, text) => {
      const instrument = findWord(text, INSTRUMENTS) ?? "your instrument";
      return [
        {
          title: "First sounds",
          foundational: true,
          missions: [`Set up and tune ${instrument}`, "Learn how to hold and position correctly", "Play your first simple notes"],
        },
        {
          title: "Core technique",
          missions: ["Learn three basic chords or scales", "Practise switching cleanly for 10 minutes", "Play along slowly with a metronome"],
        },
        {
          title: "Your first songs",
          missions: ["Learn one simple song start to finish", "Learn a second song you love", "Record yourself and listen back"],
        },
        {
          title: "Share it",
          description: "Music is meant to be heard.",
          missions: ["Play a song for someone", "Learn a song slightly above your level", "Perform or post a recording"],
        },
      ];
    },
  },
  {
    key: "language",
    match: new RegExp(`\\b(${LANGUAGES.join("|")}|language|fluent|fluency)\\b`, "i"),
    build: (ctx, text) => {
      const language = capitalise(findWord(text, LANGUAGES) ?? "the language");
      return [
        {
          title: "Foundations",
          foundational: true,
          missions: [`Learn ${language} pronunciation basics`, "Learn 100 high-frequency words", "Introduce yourself in a few sentences"],
        },
        {
          title: "Everyday conversation",
          missions: ["Learn phrases for daily situations", "Have a 5-minute practice conversation", "Listen to 30 minutes of native content"],
        },
        {
          title: "Real use",
          missions: ["Read a short article or story", "Write a short message to someone", "Hold a 15-minute conversation"],
        },
        {
          title: "Confidence",
          description: ctx.target ? `Work toward: ${ctx.target}` : undefined,
          missions: ["Watch something without subtitles", "Use the language in a real situation", ctx.target ? `Reach: ${ctx.target}` : "Take a level check"],
        },
      ];
    },
  },
  {
    key: "business",
    match: /\b(business|start-?up|company|entrepreneur(ship)?|side (hustle|income|project)|shop|store|bakery|cafe|brand|freelanc(e|ing)|clients?|customers?)\b/i,
    build: (ctx) => [
      {
        title: "Understand the problem",
        description: "Talk to people before building anything.",
        foundational: true,
        missions: ["Describe who you want to help in one sentence", "Interview 5 potential customers", "Write down the problem they repeat most"],
      },
      {
        title: "Shape the offer",
        missions: ["Sketch what you'll offer and the price", "Look at 3 alternatives people use today", "Get honest feedback on the idea"],
      },
      {
        title: "Test it for real",
        missions: ["Create the smallest version you can sell", "Find your first customer", "Learn from what went wrong"],
      },
      {
        title: "Grow",
        description: ctx.target ? `Aim: ${ctx.target}` : undefined,
        missions: ["Set up simple money tracking", "Get 5 paying customers", ctx.target ? `Reach: ${ctx.target}` : "Decide what to double down on"],
      },
    ],
  },
  {
    key: "writing",
    match: /\b(writ(e|ing)|writer|book|novel|blog|article|essay|poetry|poems?|story|stories|newsletter)\b/i,
    build: (ctx) => [
      {
        title: "Find your idea",
        foundational: true,
        missions: ["Write down what you want to say and for whom", "Read two pieces similar to what you want to write", "Outline the shape of the piece"],
      },
      {
        title: "Writing habit",
        missions: ["Write for 20 minutes on 5 days", "Finish a rough first section", "Don't edit — keep moving forward"],
      },
      {
        title: "Complete a draft",
        missions: ["Reach the end of a full draft", "Take a short break from it", "Read it through once, start to finish"],
      },
      {
        title: "Revise and share",
        description: ctx.target ? `Goal: ${ctx.target}` : undefined,
        missions: ["Revise the weakest part", "Get feedback from one reader", "Publish or share it"],
      },
    ],
  },
  {
    key: "finance",
    match: /\b(sav(e|ing|ings)|budget(ing)?|debt|invest(ing|ment)?|money|financ(e|ial)|emergency fund|retire(ment)?|income)\b/i,
    build: (ctx) => [
      {
        title: "See where you are",
        foundational: true,
        missions: ["Track every expense for two weeks", "List what you own and owe", "Write down your monthly essentials"],
      },
      {
        title: "Make a plan",
        missions: ["Create a simple monthly budget", "Pick one expense to reduce", "Set an automatic amount to save"],
      },
      {
        title: "Build momentum",
        missions: ["Stick to the budget for one month", "Build a small emergency buffer", "Learn one new money concept"],
      },
      {
        title: "Reach the target",
        description: ctx.target ? `Target: ${ctx.target}` : undefined,
        missions: ["Review progress and adjust the plan", ctx.target ? `Reach: ${ctx.target}` : "Hit your savings target"],
      },
    ],
  },
  {
    key: "reading",
    match: /\b(read(ing)?|books?)\b/i,
    build: (ctx) => [
      {
        title: "Set up the habit",
        foundational: true,
        missions: ["Choose your first book", "Pick a daily reading time and place", "Read 10 pages a day for a week"],
      },
      {
        title: "Keep going",
        missions: ["Finish your first book", "Write three things you took from it", "Choose the next book"],
      },
      {
        title: "Go deeper",
        description: ctx.target ? `Aim: ${ctx.target}` : undefined,
        missions: ["Read something outside your usual taste", "Discuss a book with someone", ctx.target ? `Reach: ${ctx.target}` : "Finish three books"],
      },
    ],
  },
  {
    key: "mindfulness",
    match: /\b(meditat(e|ion|ing)|mindful(ness)?|calm(er)?|stress|journal(ing)?|breath(ing|work)?|sleep)\b/i,
    build: () => [
      {
        title: "Start small",
        foundational: true,
        missions: ["Try a 5-minute guided session", "Choose a regular time of day", "Practise on 5 days this week"],
      },
      {
        title: "Build the practice",
        missions: ["Extend sessions to 10 minutes", "Try a different technique", "Notice and note how you feel after"],
      },
      {
        title: "Make it yours",
        missions: ["Practise for 21 days", "Use it in a stressful moment", "Reflect on what has changed"],
      },
    ],
  },
];

const GENERIC_FIRST_MISSION: Partial<Record<LifeArea, string>> = {
  PHYSICAL: "Check your starting point: what can you do today?",
  CAREER: "Talk to someone already doing what you want to do",
  RELATIONSHIPS: "Talk honestly with the people this goal involves",
  SOCIAL: "Identify the people or communities involved",
  EXPERIENCES: "Research what the experience actually takes",
};

function genericTemplate(ctx: RoadmapContext): MilestoneSpec[] {
  return [
    {
      title: "Get clear",
      description: "Know exactly what you're aiming for.",
      foundational: true,
      missions: [
        ctx.target ? `Describe success in detail: ${ctx.target}` : "Describe what success looks like",
        GENERIC_FIRST_MISSION[ctx.lifeArea] ?? "List what you already know and have",
        "Name the biggest obstacle and one way around it",
      ],
    },
    {
      title: "Build foundations",
      missions: ["Find one trusted resource or guide", "Learn the core basics", "Do a first small practice session"],
    },
    {
      title: "Practise consistently",
      missions: ["Complete 5 focused sessions", "Track what is and isn't working", "Ask someone for feedback"],
    },
    {
      title: "Make it real",
      missions: ["Try it in a real situation", "Reflect and adjust your approach", ctx.target ? `Reach your target: ${ctx.target}` : "Reach your goal"],
    },
  ];
}

function selectTemplate(text: string): Template | null {
  return TEMPLATES.find((template) => template.match.test(text)) ?? null;
}

function toMission(spec: MissionSpec) {
  return typeof spec === "string"
    ? { title: spec, description: null }
    : { title: spec.title, description: spec.description };
}

export function generateRuleBasedRoadmap(ctx: RoadmapContext): GeneratedRoadmap {
  const text = [ctx.title, ctx.description, ctx.target].filter(Boolean).join(" ");
  const template = selectTemplate(text);
  let milestones = template ? template.build(ctx, text) : genericTemplate(ctx);
  const notes: string[] = [];

  // Spec §9: skip or compress what the user already knows.
  if (ctx.startingPoint === "EXPERIENCED") {
    const kept = milestones.filter((m) => !m.foundational);
    if (kept.length > 0 && kept.length < milestones.length) {
      milestones = kept;
      notes.push("skipped the foundations you already have");
    }
  } else if (ctx.startingPoint === "SOME_EXPERIENCE") {
    milestones = milestones.map((m) => (m.foundational ? { ...m, missions: m.missions.slice(0, 1) } : m));
    notes.push("compressed the basics into a quick refresher");
  }

  // Match the user's preferred challenge level.
  if (ctx.challengeLevel === "GENTLE") {
    milestones = milestones.map((m) => ({ ...m, missions: m.missions.slice(0, 2) }));
    notes.push("kept each stage small, matching your gentle pace");
  } else if (ctx.challengeLevel === "AMBITIOUS") {
    notes.push("kept every stage at full depth for your ambitious pace");
  }

  const base = template ? `A starter roadmap for ${template.key}` : "A general starter roadmap";
  const summary = `${base}${notes.length ? `; ${notes.join(", ")}` : ""}. Edit anything — it's yours.`;

  const draft = roadmapDraftSchema.parse({
    summary: summary.slice(0, 280),
    milestones: milestones.map((m) => ({
      title: m.title,
      description: m.description ?? null,
      missions: m.missions.map(toMission),
    })),
  });

  return { draft, generator: `${GENERATOR_VERSION}:${template?.key ?? "generic"}` };
}

export const ruleBasedRoadmapGenerator: RoadmapGenerator = {
  name: GENERATOR_VERSION,
  async generate(context) {
    return generateRuleBasedRoadmap(context);
  },
};
