import type { LifeArea } from "@/generated/prisma/enums";

/**
 * The built-in skill catalogue (spec §15). Pure data: trees and skills are
 * synced into the database from these specs, so AI-generated skill paths can
 * later add trees the exact same way (rows with source AI, not new code).
 *
 * Skills are deliberately unequal — each sets its own XP cost (`baseXp`),
 * depth (`maxLevel`) and unlock gate (`requires` at `unlockLevel`).
 */

export type SkillSpec = {
  /** Slug within the tree; the stored slug is `${tree}.${slug}`. */
  slug: string;
  name: string;
  description: string;
  /** XP cost of level 1 (levels.ts). Default 50. */
  baseXp?: number;
  /** Levels this skill goes to. Default 5. */
  maxLevel?: number;
  /**
   * Tree-relative slug of the skill that gates this one, with the level it
   * must reach (`unlockLevel`, default 1). When omitted, a child skill is
   * gated by its parent; a root skill is open from the start.
   */
  requires?: string;
  unlockLevel?: number;
  children?: SkillSpec[];
};

export type SkillTreeSpec = {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  lifeArea: LifeArea;
  /** Matches goal or interest text so real work routes into this tree. */
  match: RegExp;
  /** Base quest template keys that train a specific skill in this tree. */
  templateSkills?: Record<string, string>;
  skills: SkillSpec[];
};

export const SKILL_TREES: readonly SkillTreeSpec[] = [
  {
    slug: "programming",
    name: "Programming",
    emoji: "💻",
    description: "From first lines of code to systems you're proud to ship.",
    lifeArea: "LEARNING",
    match:
      /\b(program(ming)?|coding|code|coder|developer|software|python|javascript|typescript|web ?dev(elopment)?|computer science|app|apps|website)\b/i,
    skills: [
      {
        slug: "fundamentals",
        name: "Fundamentals",
        description: "Variables, logic, loops and functions — the atoms of every program.",
        baseXp: 30,
        maxLevel: 3,
      },
      {
        slug: "python",
        name: "Python",
        description: "Real fluency in one friendly, powerful language.",
        baseXp: 60,
        requires: "fundamentals",
        children: [
          { slug: "syntax", name: "Syntax", description: "Reading and writing Python without thinking about it.", baseXp: 40, maxLevel: 3 },
          { slug: "oop", name: "OOP", description: "Classes, objects and designing code that grows.", baseXp: 60, maxLevel: 4, requires: "syntax", unlockLevel: 2 },
          { slug: "advanced-python", name: "Advanced Python", description: "Generators, decorators, typing and the deep end.", baseXp: 120, requires: "oop", unlockLevel: 2 },
        ],
      },
      {
        slug: "web-development",
        name: "Web Development",
        description: "Pages and interfaces people actually use.",
        baseXp: 60,
        requires: "fundamentals",
        unlockLevel: 2,
      },
      {
        slug: "backend",
        name: "Backend",
        description: "Servers, APIs and the machinery behind the screen.",
        baseXp: 80,
        requires: "web-development",
        unlockLevel: 2,
      },
      {
        slug: "databases",
        name: "Databases",
        description: "Modelling, storing and querying real data.",
        baseXp: 70,
        maxLevel: 4,
        requires: "fundamentals",
        unlockLevel: 2,
      },
      {
        slug: "ai-ml",
        name: "AI / ML",
        description: "Machine learning and building with models.",
        baseXp: 150,
        requires: "python",
        unlockLevel: 3,
      },
    ],
  },
  {
    slug: "fitness",
    name: "Fitness",
    emoji: "💪",
    description: "A body that carries you — strength, endurance and recovery.",
    lifeArea: "PHYSICAL",
    match: /\b(fit(ness)?|gym|muscle|run(ning)?|marathon|10k|5k|strength|exercise|workout|yoga|swim(ming)?|cycling|sport)\b/i,
    templateSkills: {
      "physical.gym": "strength",
      "physical.home-workout": "strength",
      "physical.walk": "endurance",
      "physical.run": "endurance",
      "physical.cycle": "endurance",
      "physical.sport": "athletics",
      "physical.mobility": "mobility",
      "physical.outdoors": "foundations",
    },
    skills: [
      { slug: "foundations", name: "Movement Foundations", description: "Moving daily and building the base habit.", baseXp: 25, maxLevel: 3 },
      { slug: "strength", name: "Strength Training", description: "Lifting, bodyweight work and getting stronger.", requires: "foundations" },
      { slug: "endurance", name: "Endurance", description: "Walking, running, cycling — going further, longer.", requires: "foundations" },
      { slug: "mobility", name: "Mobility & Recovery", description: "Flexibility, balance and taking care of the machine.", baseXp: 35, maxLevel: 4, requires: "foundations" },
      { slug: "athletics", name: "Sport & Athletics", description: "Skills under pressure — games, matches and play.", baseXp: 80, requires: "endurance", unlockLevel: 2 },
    ],
  },
  {
    slug: "music",
    name: "Music",
    emoji: "🎵",
    description: "From first notes to playing for other people.",
    lifeArea: "CREATIVITY",
    match: /\b(music(ian)?|guitar|piano|ukulele|drums?|violin|bass|cello|saxophone|flute|sing(ing)?|voice|song(writing)?|band)\b/i,
    skills: [
      { slug: "foundations", name: "Musical Foundations", description: "Rhythm, pitch and listening like a musician.", baseXp: 30, maxLevel: 3 },
      {
        slug: "instrument",
        name: "Instrument Practice",
        description: "Hands-on hours with your instrument (or your voice).",
        baseXp: 60,
        requires: "foundations",
        children: [
          { slug: "technique", name: "Technique", description: "Clean, controlled playing — scales, drills, form.", baseXp: 60, maxLevel: 4 },
          { slug: "repertoire", name: "Repertoire", description: "Songs and pieces you can actually play end to end.", baseXp: 60, maxLevel: 4 },
        ],
      },
      { slug: "theory", name: "Music Theory", description: "Why music works: keys, chords and harmony.", maxLevel: 4, requires: "foundations", unlockLevel: 2 },
      { slug: "performance", name: "Performance", description: "Playing for real ears — friends, open mics, stages.", baseXp: 100, maxLevel: 4, requires: "instrument", unlockLevel: 3 },
    ],
  },
  {
    slug: "photography",
    name: "Photography",
    emoji: "📷",
    description: "Seeing, shooting and finishing photographs.",
    lifeArea: "CREATIVITY",
    match: /\b(photo(graph(y|er|s)?)?|camera|dslr|portrait|landscape photography)\b/i,
    skills: [
      { slug: "basics", name: "Camera Basics", description: "Exposure, focus and knowing your camera.", baseXp: 30, maxLevel: 3 },
      { slug: "composition", name: "Composition", description: "Framing, light and making an image worth looking at.", requires: "basics" },
      { slug: "editing", name: "Editing", description: "Developing raw shots into finished photographs.", baseXp: 60, maxLevel: 4, requires: "basics", unlockLevel: 2 },
      { slug: "projects", name: "Photo Projects", description: "Series and stories, not just single shots.", baseXp: 100, maxLevel: 3, requires: "composition", unlockLevel: 2 },
    ],
  },
  {
    slug: "writing",
    name: "Writing",
    emoji: "✍️",
    description: "Putting words down — and getting them read.",
    lifeArea: "CREATIVITY",
    match: /\b(writ(e|ing|er)|blog(ging)?|novel|essay|poetry|storytell(ing|er)|screenplay|fiction)\b/i,
    skills: [
      { slug: "habit", name: "Writing Habit", description: "Showing up to the page, day after day.", baseXp: 25, maxLevel: 3 },
      { slug: "craft", name: "Craft & Style", description: "Sentences, clarity and a voice of your own.", requires: "habit" },
      { slug: "storytelling", name: "Storytelling", description: "Structure, tension and pieces people finish.", baseXp: 60, requires: "craft" },
      { slug: "publishing", name: "Sharing & Publishing", description: "Putting work in front of readers.", baseXp: 80, maxLevel: 3, requires: "craft", unlockLevel: 2 },
    ],
  },
  {
    slug: "languages",
    name: "Languages",
    emoji: "🌍",
    description: "Understanding and being understood in another language.",
    lifeArea: "LEARNING",
    match:
      /\b(language|spanish|french|german|italian|portuguese|japanese|korean|mandarin|chinese|arabic|hindi|russian|turkish|dutch|swahili|tamil|telugu|duolingo|vocabulary)\b/i,
    skills: [
      { slug: "vocabulary", name: "Vocabulary", description: "The words — from survival phrases to nuance.", baseXp: 30 },
      { slug: "listening", name: "Listening", description: "Understanding real speech at real speed.", baseXp: 40, requires: "vocabulary" },
      { slug: "speaking", name: "Speaking", description: "Making yourself understood out loud.", baseXp: 60, requires: "vocabulary", unlockLevel: 2 },
      { slug: "grammar", name: "Grammar", description: "The patterns that hold sentences together.", maxLevel: 4, requires: "vocabulary", unlockLevel: 2 },
      { slug: "fluency", name: "Fluent Conversation", description: "Long, comfortable conversations without translating in your head.", baseXp: 150, maxLevel: 3, requires: "speaking", unlockLevel: 3 },
    ],
  },
  {
    slug: "business",
    name: "Business",
    emoji: "📈",
    description: "Building something people pay for.",
    lifeArea: "CAREER",
    match: /\b(business|startup|entrepreneur(ship)?|freelanc(e|ing|er)|market(ing)?|side ?hustle|sales?|e ?commerce|customer)\b/i,
    skills: [
      { slug: "foundations", name: "Business Foundations", description: "Value, customers and how money actually flows.", baseXp: 40, maxLevel: 3 },
      { slug: "marketing", name: "Marketing", description: "Reaching the people your work is for.", baseXp: 60, requires: "foundations" },
      { slug: "finance", name: "Money & Finance", description: "Pricing, margins and keeping the books honest.", baseXp: 60, maxLevel: 4, requires: "foundations" },
      { slug: "product", name: "Product & Service", description: "Making the thing itself worth coming back for.", baseXp: 70, requires: "foundations", unlockLevel: 2 },
      { slug: "strategy", name: "Strategy & Growth", description: "Choosing what not to do, and scaling what works.", baseXp: 120, maxLevel: 4, requires: "product", unlockLevel: 2 },
    ],
  },
  {
    slug: "cooking",
    name: "Cooking",
    emoji: "🍳",
    description: "Feeding yourself (and others) well, from scratch.",
    lifeArea: "SKILLS",
    match: /\b(cook(ing)?|recipes?|bak(e|ing)|cuisine|meal ?prep|kitchen|chef)\b/i,
    skills: [
      { slug: "basics", name: "Kitchen Basics", description: "Knife skills, heat control and not burning the rice.", baseXp: 25, maxLevel: 3 },
      { slug: "everyday", name: "Everyday Cooking", description: "A rotation of meals you can make without a recipe.", baseXp: 40, requires: "basics" },
      { slug: "baking", name: "Baking", description: "Bread, pastry and the science of the oven.", baseXp: 60, maxLevel: 4, requires: "basics", unlockLevel: 2 },
      { slug: "world-cuisines", name: "World Cuisines", description: "Cooking your way through other food cultures.", baseXp: 80, maxLevel: 4, requires: "everyday", unlockLevel: 2 },
    ],
  },
  {
    slug: "art",
    name: "Art",
    emoji: "🎨",
    description: "Drawing, painting and developing an eye of your own.",
    lifeArea: "CREATIVITY",
    match: /\b(draw(ing)?|paint(ing)?|sketch(ing)?|illustrat(e|ion|or)|art(ist)?|design|watercolor|watercolour)\b/i,
    skills: [
      { slug: "drawing-basics", name: "Drawing Basics", description: "Lines, shapes and proportion — learning to see.", baseXp: 30, maxLevel: 3 },
      { slug: "sketching", name: "Observational Sketching", description: "Drawing from life, quickly and often.", requires: "drawing-basics" },
      { slug: "color", name: "Colour & Light", description: "Value, palettes and making images glow.", baseXp: 60, maxLevel: 4, requires: "drawing-basics", unlockLevel: 2 },
      { slug: "style", name: "Personal Style", description: "Work that's recognisably yours.", baseXp: 100, maxLevel: 4, requires: "color", unlockLevel: 2 },
    ],
  },
  {
    slug: "communication",
    name: "Communication",
    emoji: "🗣️",
    description: "Being heard, and hearing people properly.",
    lifeArea: "SOCIAL",
    match: /\b(communicat(e|ion)|public speaking|speech(es)?|present(ation|ing)?|network(ing)?|social confidence|conversation(s)?|debate)\b/i,
    templateSkills: {
      "social.call": "conversation",
      "social.meaningful-conversation": "listening",
      "social.reconnect": "conversation",
      "social.thank-someone": "conversation",
      "social.help-someone": "listening",
      "social.someone-new": "confidence",
    },
    skills: [
      { slug: "conversation", name: "Everyday Conversation", description: "Easy, genuine exchanges with the people around you.", baseXp: 30 },
      { slug: "listening", name: "Active Listening", description: "Hearing what's actually being said.", baseXp: 40, maxLevel: 4, requires: "conversation" },
      { slug: "confidence", name: "Social Confidence", description: "New people, new rooms, no scripts.", baseXp: 60, requires: "conversation", unlockLevel: 2 },
      { slug: "public-speaking", name: "Public Speaking", description: "Holding a room — from toasts to talks.", baseXp: 120, maxLevel: 4, requires: "confidence", unlockLevel: 2 },
    ],
  },
  {
    slug: "leadership",
    name: "Leadership",
    emoji: "🧭",
    description: "Taking responsibility for outcomes bigger than yourself.",
    lifeArea: "CAREER",
    match: /\b(lead(ership|ing)?|manag(e|er|ing|ement)|team ?lead|mentor(ing)?|coach(ing)?)\b/i,
    skills: [
      { slug: "self-leadership", name: "Self-Leadership", description: "Owning your time, energy and word.", baseXp: 40, maxLevel: 4 },
      { slug: "teamwork", name: "Teamwork", description: "Pulling well with others toward one outcome.", maxLevel: 4, requires: "self-leadership" },
      { slug: "mentoring", name: "Mentoring Others", description: "Making the people around you better.", baseXp: 80, maxLevel: 4, requires: "teamwork", unlockLevel: 2 },
      { slug: "vision", name: "Vision & Direction", description: "Setting a direction people want to follow.", baseXp: 120, maxLevel: 3, requires: "mentoring", unlockLevel: 2 },
    ],
  },
];

/** The stored, globally unique slug for a skill in a tree. */
export function fullSkillSlug(treeSlug: string, skillSlug: string): string {
  return `${treeSlug}.${skillSlug}`;
}

export function findTreeSpec(slug: string): SkillTreeSpec | undefined {
  return SKILL_TREES.find((tree) => tree.slug === slug);
}

/** Flattens a tree spec to preorder, pairing each skill with its parent slug. */
export function flattenSpec(tree: SkillTreeSpec): { spec: SkillSpec; parentSlug: string | null }[] {
  const out: { spec: SkillSpec; parentSlug: string | null }[] = [];
  const walk = (specs: SkillSpec[], parentSlug: string | null) => {
    for (const spec of specs) {
      out.push({ spec, parentSlug });
      if (spec.children) walk(spec.children, spec.slug);
    }
  };
  walk(tree.skills, null);
  return out;
}

/** The requirement a spec resolves to: explicit, else its parent, else none. */
export function requirementOf(spec: SkillSpec, parentSlug: string | null): { slug: string; level: number } | null {
  const slug = spec.requires ?? parentSlug;
  return slug ? { slug, level: spec.unlockLevel ?? 1 } : null;
}
