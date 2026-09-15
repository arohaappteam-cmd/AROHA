import type { LifeArea, QuestDifficulty } from "@/generated/prisma/enums";
import { interestSlug } from "@/modules/identity/interests";

import type { QuestSlot } from "./categories";
import type { QuestGenerationContext } from "./context";
import { libraryLearningProvider } from "./learning";
import type { QuestPayload } from "./payload";
import { pickOne } from "./random";

/**
 * Rule-based quest templates. Each describes a real-world action, when it
 * fits the user, and how to scale it to their time and energy.
 */

export type TemplateBuild = {
  title: string;
  description: string;
  steps: string[];
  payload: QuestPayload | null;
  goalId?: string | null;
  missionId?: string | null;
  /** Extra personal reason, shown alongside the generic rationale. */
  reason?: string;
  /** Override the computed minutes (e.g. a fixed-length lesson). */
  minutes?: number;
};

export type QuestTemplate = {
  key: string;
  slot: QuestSlot;
  lifeArea: LifeArea;
  /** Baseline effort before energy and challenge adjustments. */
  difficulty: QuestDifficulty;
  minMinutes: number;
  maxMinutes: number;
  /** Tags used to avoid near-duplicates on the same day (e.g. two walks). */
  tags?: string[];
  /** Relative likelihood for this user; 0 means not eligible. */
  weight: (ctx: QuestGenerationContext) => number;
  build: (ctx: QuestGenerationContext, minutes: number, rng: () => number) => TemplateBuild;
};

const moves = (ctx: QuestGenerationContext) => ctx.preferences.movementOptions;
const learns = (ctx: QuestGenerationContext) => ctx.preferences.learningFormats;
const low = (ctx: QuestGenerationContext) => ctx.energy === "LOW";
const noMovementSet = (ctx: QuestGenerationContext) => moves(ctx).length === 0;

/** Weight helper: base weight if the user listed the option, else fallback. */
function prefers(listed: boolean, base = 4, fallback = 0) {
  return listed ? base : fallback;
}

// ─── 💪 Physical ────────────────────────────────────────────────────────────

const PHYSICAL: QuestTemplate[] = [
  {
    key: "physical.gym",
    slot: "PHYSICAL",
    lifeArea: "PHYSICAL",
    difficulty: "MEDIUM",
    minMinutes: 25,
    maxMinutes: 75,
    weight: (ctx) => (low(ctx) ? 0 : prefers(moves(ctx).includes("GYM"), 5)),
    build: (_ctx, m) => ({
      title: `Train at the gym for ${m} minutes`,
      description: "A focused strength session. Quality reps over quantity.",
      steps: ["Warm up for 5 minutes", "Work through your main lifts or machines", "Finish with a short stretch"],
      payload: null,
      reason: "you train at the gym",
    }),
  },
  {
    key: "physical.home-workout",
    slot: "PHYSICAL",
    lifeArea: "PHYSICAL",
    difficulty: "MEDIUM",
    minMinutes: 10,
    maxMinutes: 45,
    weight: (ctx) => (low(ctx) ? 0 : prefers(moves(ctx).includes("HOME_WORKOUT"), 5, noMovementSet(ctx) ? 3 : 0)),
    build: (_ctx, m) => ({
      title: `Complete a ${m}-minute home workout`,
      description: "No equipment needed — just enough floor space to move.",
      steps: ["Squats, push-ups and lunges", "Rest briefly between rounds", "Repeat until the time is up"],
      payload: null,
      reason: "home workouts fit your life",
    }),
  },
  {
    key: "physical.walk",
    slot: "PHYSICAL",
    lifeArea: "PHYSICAL",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 60,
    tags: ["walk"],
    weight: (ctx) => prefers(moves(ctx).includes("WALKING"), 4, noMovementSet(ctx) || low(ctx) ? 3 : 1),
    build: (_ctx, m) => ({
      title: `Walk for ${m} minutes`,
      description: "Brisk enough to warm up. Outside if you can.",
      steps: ["Pick a route before you leave", "Keep a pace where talking takes a little effort"],
      payload: null,
    }),
  },
  {
    key: "physical.run",
    slot: "PHYSICAL",
    lifeArea: "PHYSICAL",
    difficulty: "MEDIUM",
    minMinutes: 15,
    maxMinutes: 60,
    weight: (ctx) => (low(ctx) ? 0 : prefers(moves(ctx).includes("RUNNING"), 5)),
    build: (_ctx, m) => ({
      title: `Go for a ${m}-minute run`,
      description: "Easy, conversational pace unless you've planned otherwise.",
      steps: ["Walk for 3 minutes to warm up", "Run at a pace you could hold a conversation at", "Cool down with a short walk"],
      payload: null,
      reason: "you enjoy running",
    }),
  },
  {
    key: "physical.cycle",
    slot: "PHYSICAL",
    lifeArea: "PHYSICAL",
    difficulty: "MEDIUM",
    minMinutes: 15,
    maxMinutes: 90,
    weight: (ctx) => (low(ctx) ? 0 : prefers(moves(ctx).includes("CYCLING"), 5)),
    build: (_ctx, m) => ({
      title: `Ride for ${m} minutes`,
      description: "Commute, explore or just go for a spin.",
      steps: ["Check your tyres and lights", "Ride at a steady effort"],
      payload: null,
      reason: "you like cycling",
    }),
  },
  {
    key: "physical.sport",
    slot: "PHYSICAL",
    lifeArea: "PHYSICAL",
    difficulty: "MEDIUM",
    minMinutes: 20,
    maxMinutes: 90,
    weight: (ctx) => (low(ctx) ? 0 : prefers(moves(ctx).includes("SPORTS"), 4)),
    build: (_ctx, m) => ({
      title: `Play a sport for ${m} minutes`,
      description: "Any game that gets your heart rate up counts — better with other people.",
      steps: ["Invite someone or join a pickup game", "Warm up before going all-in"],
      payload: null,
      reason: "you play sports",
    }),
  },
  {
    key: "physical.mobility",
    slot: "PHYSICAL",
    lifeArea: "PHYSICAL",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 40,
    weight: (ctx) => prefers(moves(ctx).includes("YOGA_MOBILITY"), 4, low(ctx) ? 3 : noMovementSet(ctx) ? 1 : 0),
    build: (_ctx, m) => ({
      title: `Stretch and move for ${m} minutes`,
      description: "Gentle yoga or mobility work. Your body will thank you tomorrow.",
      steps: ["Neck, shoulders and hips first", "Hold each stretch for about 30 seconds", "Breathe slowly throughout"],
      payload: null,
    }),
  },
  {
    key: "physical.outdoors",
    slot: "PHYSICAL",
    lifeArea: "PHYSICAL",
    difficulty: "MEDIUM",
    minMinutes: 20,
    maxMinutes: 90,
    tags: ["outdoors"],
    weight: (ctx) => (low(ctx) ? 0 : prefers(moves(ctx).includes("OUTDOORS"), 4)),
    build: (_ctx, m) => ({
      title: `Spend ${m} active minutes outdoors`,
      description: "Hiking, gardening, swimming, exploring — anything that moves you, outside.",
      steps: ["Choose somewhere with fresh air", "Leave your phone in your pocket"],
      payload: null,
      reason: "you like being outdoors",
    }),
  },
];

// ─── 🧠 Mental ──────────────────────────────────────────────────────────────

const JOURNAL_PROMPTS = [
  "What's taking up the most space in your head today?",
  "What went well yesterday, and why?",
  "What would make today feel worthwhile?",
  "What are you avoiding, and what's one small way to face it?",
  "When did you last feel fully present? What were you doing?",
  "What do you need more of this week — and less of?",
];

const MENTAL: QuestTemplate[] = [
  {
    key: "mental.meditation",
    slot: "MENTAL",
    lifeArea: "MENTAL",
    difficulty: "EASY",
    minMinutes: 5,
    maxMinutes: 20,
    weight: (ctx) => (ctx.preferences.preferredTimeOfDay === "EVENING" ? 3 : 5),
    build: (_ctx, m) => ({
      title: `Meditate for ${m} minutes`,
      description: "Sit comfortably, focus on your breath, and gently return to it whenever your mind wanders.",
      steps: ["Set a timer", "Close your eyes and follow the breath", "Wandering is normal — just come back"],
      payload: null,
    }),
  },
  {
    key: "mental.breathing",
    slot: "MENTAL",
    lifeArea: "MENTAL",
    difficulty: "EASY",
    minMinutes: 3,
    maxMinutes: 10,
    weight: (ctx) => (low(ctx) ? 5 : 2),
    build: (_ctx, m) => ({
      title: `Take a ${m}-minute breathing reset`,
      description: "Box breathing: in for 4, hold for 4, out for 4, hold for 4.",
      steps: ["Breathe in for a count of 4", "Hold for 4", "Breathe out for 4", "Hold for 4, and repeat"],
      payload: null,
    }),
  },
  {
    key: "mental.journal",
    slot: "MENTAL",
    lifeArea: "MENTAL",
    difficulty: "EASY",
    minMinutes: 5,
    maxMinutes: 20,
    weight: (ctx) => (ctx.preferences.preferredTimeOfDay === "EVENING" ? 5 : 3),
    build: (_ctx, m, rng) => {
      const prompt = pickOne(JOURNAL_PROMPTS, rng)!;
      return {
        title: `Journal for ${m} minutes`,
        description: `Today's prompt: ${prompt}`,
        steps: ["Write without editing", "Stop when the timer ends, even mid-sentence"],
        payload: { kind: "prompts", prompts: [prompt] },
      };
    },
  },
  {
    key: "mental.digital-break",
    slot: "MENTAL",
    lifeArea: "MENTAL",
    difficulty: "MEDIUM",
    minMinutes: 30,
    maxMinutes: 90,
    weight: (ctx) => (low(ctx) ? 1 : 3),
    build: (_ctx, m) => ({
      title: `Take a ${m}-minute digital break`,
      description: "No phone, no screens. Notice what you do with the space.",
      steps: ["Put your phone in another room", "Do something offline — read, cook, sit outside"],
      payload: null,
    }),
  },
  {
    key: "mental.mindful-walk",
    slot: "MENTAL",
    lifeArea: "MENTAL",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 20,
    tags: ["walk"],
    weight: () => 2,
    build: (_ctx, m) => ({
      title: `Take a ${m}-minute mindful walk`,
      description: "Walk slowly and pay attention: five things you see, four you hear, three you feel.",
      steps: ["Leave headphones behind", "Notice sights, sounds and sensations"],
      payload: null,
    }),
  },
  {
    key: "mental.gratitude",
    slot: "MENTAL",
    lifeArea: "MENTAL",
    difficulty: "EASY",
    minMinutes: 5,
    maxMinutes: 10,
    weight: (ctx) => (low(ctx) ? 4 : 2),
    build: () => ({
      title: "Write down three things you're grateful for",
      description: "Be specific — 'my sister's voice message this morning' beats 'family'.",
      steps: ["Write three specific things", "Add one sentence on why each matters"],
      payload: { kind: "prompts", prompts: ["What are three specific things you're grateful for today?"] },
    }),
  },
];

// ─── 📚 Learning ────────────────────────────────────────────────────────────

const PRACTICE_AREAS: LifeArea[] = ["LEARNING", "SKILLS", "CREATIVITY", "CAREER", "PERSONAL_DEVELOPMENT"];

function practiceTopics(ctx: QuestGenerationContext): string[] {
  const preferred = ctx.interests.filter((i) => i.lifeArea === null || PRACTICE_AREAS.includes(i.lifeArea));
  return preferred.map((i) => i.label);
}

function recentLessonIds(ctx: QuestGenerationContext) {
  return ctx.recentTemplateKeys.filter((k) => k.startsWith("learning.lesson:")).map((k) => k.split(":")[1]);
}

const LEARNING: QuestTemplate[] = [
  {
    key: "learning.reading",
    slot: "LEARNING",
    lifeArea: "LEARNING",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 45,
    weight: (ctx) => prefers(learns(ctx).includes("READING"), 5, learns(ctx).length === 0 ? 3 : 0),
    build: (_ctx, m) => {
      const pages = Math.max(5, Math.round(m / 1.5 / 5) * 5);
      return {
        title: `Read ${pages} pages`,
        description: "Any book you're into. No book right now? Swap this for a micro-lesson.",
        steps: ["Put your phone out of reach", "Note one idea worth remembering"],
        payload: { kind: "reading", pages },
        minutes: Math.round((pages * 1.5) / 5) * 5,
      };
    },
  },
  {
    key: "learning.practice",
    slot: "LEARNING",
    lifeArea: "LEARNING",
    difficulty: "MEDIUM",
    minMinutes: 15,
    maxMinutes: 45,
    weight: (ctx) => (practiceTopics(ctx).length === 0 ? 0 : prefers(learns(ctx).includes("HANDS_ON"), 5, 2)),
    build: (ctx, m, rng) => {
      const topic = pickOne(practiceTopics(ctx), rng)!;
      return {
        title: `Practise ${topic.toLowerCase()} for ${m} minutes`,
        description: "Deliberate practice: pick one thing you can't quite do yet and work on just that.",
        steps: ["Choose one specific skill to improve", "Practise it in short, focused attempts", "Write down what improved"],
        payload: { kind: "practice", topic },
        reason: `you're interested in ${topic.toLowerCase()}`,
      };
    },
  },
  {
    key: "learning.lesson",
    slot: "LEARNING",
    lifeArea: "LEARNING",
    difficulty: "EASY",
    minMinutes: 5,
    maxMinutes: 15,
    weight: (ctx) => prefers(learns(ctx).includes("AI_LESSONS"), 6, 2),
    build: (ctx, _m, rng) => {
      const lesson = libraryLearningProvider.suggest({
        interests: ctx.interests.map((i) => i.label),
        recentLessonIds: recentLessonIds(ctx),
        rng,
      })!;
      return {
        title: `Micro-lesson: ${lesson.title}`,
        description: lesson.hook,
        steps: ["Read the lesson in AROHA", "Answer the reflection question in your own words"],
        payload: { kind: "lesson", provider: "library", lessonId: lesson.id, title: lesson.title },
        minutes: lesson.minutes,
      };
    },
  },
  {
    key: "learning.podcast",
    slot: "LEARNING",
    lifeArea: "LEARNING",
    difficulty: "EASY",
    minMinutes: 15,
    maxMinutes: 45,
    weight: (ctx) => prefers(learns(ctx).includes("AUDIO"), 4),
    build: (ctx, m, rng) => {
      const topic = pickOne(ctx.interests.map((i) => i.label), rng) ?? null;
      return {
        title: `Listen to ${m} minutes of something that teaches you`,
        description: topic ? `A podcast or talk about ${topic.toLowerCase()} — great on a walk or commute.` : "A podcast, audiobook chapter or talk — great on a walk or commute.",
        steps: ["Pick the episode before you start", "Afterwards, sum it up in one sentence"],
        payload: { kind: "media", format: "AUDIO", topic },
      };
    },
  },
  {
    key: "learning.video",
    slot: "LEARNING",
    lifeArea: "LEARNING",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 30,
    weight: (ctx) => prefers(learns(ctx).includes("VIDEO"), 4),
    build: (ctx, m, rng) => {
      const topic = pickOne(ctx.interests.map((i) => i.label), rng) ?? null;
      return {
        title: `Watch a ${m}-minute lesson${topic ? ` on ${topic.toLowerCase()}` : ""}`,
        description: "Choose one video with a clear teacher. Pause and try things as you go.",
        steps: ["Pick one video, not a playlist", "Take one note you'll use"],
        payload: { kind: "media", format: "VIDEO", topic },
      };
    },
  },
  {
    key: "learning.course",
    slot: "LEARNING",
    lifeArea: "LEARNING",
    difficulty: "MEDIUM",
    minMinutes: 15,
    maxMinutes: 45,
    weight: (ctx) => (low(ctx) ? 0 : prefers(learns(ctx).includes("COURSES"), 4)),
    build: (_ctx, m) => ({
      title: "Complete one lesson of your course",
      description: `Around ${m} minutes. Finish the lesson and do its exercise.`,
      steps: ["Open where you left off", "Do the exercise, not just the video"],
      payload: { kind: "media", format: "COURSE", topic: null },
    }),
  },
];

// ─── 🤝 Social ──────────────────────────────────────────────────────────────

const relationshipsMatter = (ctx: QuestGenerationContext) =>
  ctx.focusAreas.includes("RELATIONSHIPS") || ctx.interests.some((i) => i.lifeArea === "RELATIONSHIPS");

const SOCIAL: QuestTemplate[] = [
  {
    key: "social.call",
    slot: "SOCIAL",
    lifeArea: "SOCIAL",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 30,
    weight: () => 5,
    build: (_ctx, m) => ({
      title: "Call someone you care about",
      description: `A real voice call, around ${m} minutes. Ask how they're actually doing.`,
      steps: ["Pick someone you haven't spoken to in a while", "Ask one question beyond 'how are you?'"],
      payload: null,
    }),
  },
  {
    key: "social.phone-free-time",
    slot: "SOCIAL",
    lifeArea: "SOCIAL",
    difficulty: "MEDIUM",
    minMinutes: 15,
    maxMinutes: 60,
    weight: (ctx) => (relationshipsMatter(ctx) ? 5 : 3),
    build: (ctx, m) => ({
      title: `Spend ${m} phone-free minutes with someone`,
      description: "Family, a partner, a friend. Phone away, full attention.",
      steps: ["Put your phone face down, out of reach", "Let the conversation go wherever it goes"],
      payload: null,
      reason: relationshipsMatter(ctx) ? "relationships matter to you" : undefined,
    }),
  },
  {
    key: "social.meaningful-conversation",
    slot: "SOCIAL",
    lifeArea: "SOCIAL",
    difficulty: "MEDIUM",
    minMinutes: 15,
    maxMinutes: 30,
    weight: (ctx) => (low(ctx) ? 1 : 3),
    build: (_ctx, m) => ({
      title: "Have a meaningful conversation",
      description: `At least ${m} minutes about something that matters — without checking your phone.`,
      steps: ["Ask an open question", "Listen more than you talk"],
      payload: null,
    }),
  },
  {
    key: "social.thank-someone",
    slot: "SOCIAL",
    lifeArea: "SOCIAL",
    difficulty: "EASY",
    minMinutes: 5,
    maxMinutes: 10,
    weight: (ctx) => (low(ctx) ? 5 : 2),
    build: () => ({
      title: "Thank someone properly",
      description: "Tell someone specifically what they did and what it meant to you.",
      steps: ["Think of someone who helped you recently", "Say or write exactly what it meant"],
      payload: null,
    }),
  },
  {
    key: "social.help-someone",
    slot: "SOCIAL",
    lifeArea: "SOCIAL",
    difficulty: "MEDIUM",
    minMinutes: 10,
    maxMinutes: 45,
    weight: (ctx) => (low(ctx) ? 0 : 3),
    build: (_ctx, m) => ({
      title: "Help someone today",
      description: `Offer ${m} minutes of your time — a favour, a hand, some advice.`,
      steps: ["Notice who could use a hand", "Offer, don't wait to be asked"],
      payload: null,
    }),
  },
  {
    key: "social.reconnect",
    slot: "SOCIAL",
    lifeArea: "SOCIAL",
    difficulty: "EASY",
    minMinutes: 5,
    maxMinutes: 10,
    weight: () => 3,
    build: () => ({
      title: "Message an old friend",
      description: "Someone you've lost touch with. A short, genuine message is enough.",
      steps: ["Scroll back to someone you miss", "Mention a memory you share"],
      payload: null,
    }),
  },
  {
    key: "social.someone-new",
    slot: "SOCIAL",
    lifeArea: "SOCIAL",
    difficulty: "HARD",
    minMinutes: 5,
    maxMinutes: 15,
    weight: (ctx) => (low(ctx) ? 0 : ctx.preferences.challengeLevel === "AMBITIOUS" ? 4 : 1),
    build: () => ({
      title: "Start a conversation with someone new",
      description: "A neighbour, a colleague you rarely talk to, someone at an event.",
      steps: ["Open with a simple observation or question", "Remember their name"],
      payload: null,
    }),
  },
];

// ─── 🎯 Personal goal ───────────────────────────────────────────────────────

const PERSONAL_GOAL: QuestTemplate[] = [
  {
    key: "goal.mission",
    slot: "PERSONAL_GOAL",
    lifeArea: "PERSONAL_GOAL",
    difficulty: "MEDIUM",
    minMinutes: 15,
    maxMinutes: 90,
    weight: (ctx) => (ctx.majorGoal?.next?.missionId ? 10 : 0),
    build: (ctx, m) => {
      const goal = ctx.majorGoal!;
      const next = goal.next!;
      return {
        title: `${m} minutes on: ${next.missionTitle}`,
        description: `A focused session moving “${goal.title}” forward — part of ${next.milestoneTitle}.`,
        steps: ["Remove distractions for the session", `Work only on “${next.missionTitle}”`, "Note where you stopped for next time"],
        payload: { kind: "goal", goalId: goal.id, missionId: next.missionId, href: `/goals/${goal.id}` },
        goalId: goal.id,
        missionId: next.missionId,
        reason: `it's the next step in “${goal.title}”`,
      };
    },
  },
  {
    key: "goal.plan-milestone",
    slot: "PERSONAL_GOAL",
    lifeArea: "PERSONAL_GOAL",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 20,
    weight: (ctx) => (ctx.majorGoal?.next && !ctx.majorGoal.next.missionId ? 10 : 0),
    build: (ctx) => {
      const goal = ctx.majorGoal!;
      return {
        title: `Plan the missions for “${goal.next!.milestoneTitle}”`,
        description: `This milestone of “${goal.title}” has no concrete missions yet. Break it into steps you can finish.`,
        steps: ["Open the goal's roadmap", "Add 2–3 missions you could finish in a week each"],
        payload: { kind: "goal", goalId: goal.id, missionId: null, href: `/goals/${goal.id}` },
        goalId: goal.id,
        reason: `“${goal.title}” needs its next steps defined`,
      };
    },
  },
  {
    key: "goal.map-roadmap",
    slot: "PERSONAL_GOAL",
    lifeArea: "PERSONAL_GOAL",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 20,
    weight: (ctx) => (ctx.majorGoal && !ctx.majorGoal.hasRoadmap ? 10 : 0),
    build: (ctx) => {
      const goal = ctx.majorGoal!;
      return {
        title: `Map out a roadmap for “${goal.title}”`,
        description: "Turn the big goal into milestones and missions — suggest one or build it yourself.",
        steps: ["Open the goal", "Generate a starter roadmap or add milestones", "Make the first mission small"],
        payload: { kind: "goal", goalId: goal.id, missionId: null, href: `/goals/${goal.id}` },
        goalId: goal.id,
        reason: "your major goal doesn't have a roadmap yet",
      };
    },
  },
  {
    key: "goal.review-finished-roadmap",
    slot: "PERSONAL_GOAL",
    lifeArea: "PERSONAL_GOAL",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 20,
    weight: (ctx) => (ctx.majorGoal && ctx.majorGoal.hasRoadmap && !ctx.majorGoal.next ? 10 : 0),
    build: (ctx) => {
      const goal = ctx.majorGoal!;
      return {
        title: `Decide what's next for “${goal.title}”`,
        description: "Every step on its roadmap is done. Complete the goal, or add the next milestone.",
        steps: ["Look back at what you've achieved", "Complete the goal or extend the roadmap"],
        payload: { kind: "goal", goalId: goal.id, missionId: null, href: `/goals/${goal.id}` },
        goalId: goal.id,
        reason: "your roadmap is finished",
      };
    },
  },
  {
    key: "goal.choose-goal",
    slot: "PERSONAL_GOAL",
    lifeArea: "PERSONAL_GOAL",
    difficulty: "EASY",
    minMinutes: 10,
    maxMinutes: 15,
    weight: (ctx) => (ctx.majorGoal ? 0 : 10),
    build: () => ({
      title: "Choose one goal worth pursuing",
      description: "What would make the next few months meaningful? Write it down in AROHA and get a roadmap.",
      steps: ["Think of what you'd be proud of in six months", "Create the goal in AROHA", "Keep the first step small"],
      payload: { kind: "goal", goalId: null, missionId: null, href: "/goals/new" },
      reason: "you don't have an active goal yet",
    }),
  },
];

// ─── ✨ Bonus (creativity / experiences) ────────────────────────────────────

const BONUS: QuestTemplate[] = [
  {
    key: "bonus.create",
    slot: "BONUS",
    lifeArea: "CREATIVITY",
    difficulty: "MEDIUM",
    minMinutes: 15,
    maxMinutes: 45,
    weight: (ctx) => (ctx.focusAreas.includes("CREATIVITY") ? 5 : 0),
    build: (ctx, m, rng) => {
      const creative = ctx.interests.filter((i) => i.lifeArea === "CREATIVITY").map((i) => i.label);
      const topic = pickOne(creative, rng);
      return {
        title: topic ? `Make something: ${m} minutes of ${topic.toLowerCase()}` : `Create something for ${m} minutes`,
        description: "Not for anyone else. Finish something small rather than start something big.",
        steps: ["Decide what 'done' looks like for today", "Make it — imperfect is fine"],
        payload: topic ? { kind: "practice", topic } : null,
        reason: "creativity is one of your focus areas",
      };
    },
  },
  {
    key: "bonus.explore",
    slot: "BONUS",
    lifeArea: "EXPERIENCES",
    difficulty: "MEDIUM",
    minMinutes: 20,
    maxMinutes: 90,
    tags: ["outdoors"],
    weight: (ctx) => (ctx.focusAreas.includes("EXPERIENCES") ? 5 : 0),
    build: () => ({
      title: "Go somewhere you've never been",
      description: "A new street, park, café or shop nearby. Notice what's different.",
      steps: ["Pick a place within reach", "Stay long enough to actually look around"],
      payload: null,
      reason: "new experiences are one of your focus areas",
    }),
  },
];

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [...PHYSICAL, ...MENTAL, ...LEARNING, ...SOCIAL, ...PERSONAL_GOAL, ...BONUS];

export function templatesForSlot(slot: QuestSlot): QuestTemplate[] {
  return QUEST_TEMPLATES.filter((t) => t.slot === slot);
}

/** Lesson quests record which lesson they used, so lessons don't repeat. */
export function recordedTemplateKey(template: QuestTemplate, build: TemplateBuild): string {
  if (build.payload?.kind === "lesson") return `${template.key}:${build.payload.lessonId}`;
  if (build.payload?.kind === "practice") return `${template.key}:${interestSlug(build.payload.topic)}`;
  return template.key;
}

export function baseTemplateKey(recordedKey: string): string {
  return recordedKey.split(":")[0];
}
