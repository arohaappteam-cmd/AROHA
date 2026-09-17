import type { SkillStateRow } from "@/modules/skills/state";

import type {
  AssessmentDefinition,
  PracticalDefinition,
  ProjectAssessmentDefinition,
  QuizDefinition,
  RubricCriterion,
} from "./types";

/**
 * The built-in assessment catalogue (spec §25).
 *
 * Quizzes check understanding; practical tasks and project assessments check
 * ability. Only the latter two can confirm mastery — knowing about a skill is
 * not the same as being able to do it, and finishing lessons is neither.
 */

const QUIZZES: readonly QuizDefinition[] = [
  {
    key: "quiz.programming.fundamentals",
    kind: "QUIZ",
    skillSlug: "programming.fundamentals",
    title: "Programming fundamentals check",
    summary: "Variables, conditions, loops and functions — the ideas every language shares.",
    minutes: 5,
    passPercent: 80,
    questions: [
      {
        prompt: "What does a variable do in a program?",
        options: ["Stores a value under a name so it can be used later", "Repeats a block of code", "Stops the program when something goes wrong", "Connects the program to the internet"],
        answer: 0,
        explanation: "A variable is a named place to keep a value, like a labelled box.",
      },
      {
        prompt: "A loop runs `for i in 0..4` including both ends. How many times does its body run?",
        options: ["3", "4", "5", "Forever"],
        answer: 2,
        explanation: "0, 1, 2, 3 and 4 — five values, so five runs.",
      },
      {
        prompt: "What is the main reason to write a function?",
        options: ["To make the program run faster", "To give a reusable name to a piece of logic", "To store data permanently", "To avoid using variables"],
        answer: 1,
        explanation: "Functions package logic so you can reuse it, test it and read it as one idea.",
      },
      {
        prompt: "`if (score > 10) { ... } else { ... }` — when does the else branch run?",
        options: ["When score is exactly 10 or less", "When score is more than 10", "Always, after the if branch", "Never"],
        answer: 0,
        explanation: "The else branch runs whenever the condition is false: score ≤ 10.",
      },
      {
        prompt: "Your program crashes on line 20. What is usually the best first step?",
        options: ["Rewrite the whole program", "Read the error message and check the values just before line 20", "Delete line 20", "Add more features"],
        answer: 1,
        explanation: "Error messages and the state right before a failure are the fastest route to the cause.",
      },
    ],
  },
  {
    key: "quiz.programming.syntax",
    kind: "QUIZ",
    skillSlug: "programming.syntax",
    title: "Python syntax check",
    summary: "Reading and writing everyday Python correctly.",
    minutes: 6,
    passPercent: 80,
    questions: [
      {
        prompt: "What does `len([3, 1, 4])` return?",
        options: ["3", "8", "[3, 1, 4]", "An error"],
        answer: 0,
        explanation: "`len` counts the items in the list: three.",
      },
      {
        prompt: "How does Python mark the body of an `if` statement?",
        options: ["Curly braces", "Indentation after a colon", "The word `then`", "Semicolons"],
        answer: 1,
        explanation: "A colon ends the `if` line and the indented lines below form its body.",
      },
      {
        prompt: "What does `names[-1]` give you?",
        options: ["The first item", "The last item", "An error — indexes can't be negative", "The list reversed"],
        answer: 1,
        explanation: "Negative indexes count from the end; -1 is the last item.",
      },
      {
        prompt: "Which creates a dictionary?",
        options: ["`[\"a\", 1]`", "`(\"a\", 1)`", "`{\"a\": 1}`", "`<\"a\": 1>`"],
        answer: 2,
        explanation: "Curly braces with `key: value` pairs make a dict.",
      },
      {
        prompt: "What does `[n * 2 for n in range(3)]` produce?",
        options: ["[0, 2, 4]", "[2, 4, 6]", "[0, 1, 2]", "6"],
        answer: 0,
        explanation: "range(3) is 0, 1, 2; doubling each gives [0, 2, 4].",
      },
    ],
  },
  {
    key: "quiz.photography.basics",
    kind: "QUIZ",
    skillSlug: "photography.basics",
    title: "Camera basics check",
    summary: "Aperture, shutter speed, ISO and what they do to a photo.",
    minutes: 5,
    passPercent: 80,
    questions: [
      {
        prompt: "Which setting mainly controls how much of the scene is in focus (depth of field)?",
        options: ["Aperture", "ISO", "White balance", "File format"],
        answer: 0,
        explanation: "A wide aperture (small f-number) gives shallow depth of field; a narrow one keeps more in focus.",
      },
      {
        prompt: "You're photographing a cyclist and the image is blurry. What should you change first?",
        options: ["Use a faster shutter speed", "Lower the ISO", "Use a smaller aperture", "Switch to black and white"],
        answer: 0,
        explanation: "A faster shutter speed freezes motion.",
      },
      {
        prompt: "What is the usual trade-off of raising ISO?",
        options: ["More noise/grain", "Less depth of field", "Slower autofocus", "Colours become warmer"],
        answer: 0,
        explanation: "Higher ISO brightens the exposure but adds noise.",
      },
      {
        prompt: "Which f-number lets in the most light?",
        options: ["f/1.8", "f/5.6", "f/11", "f/22"],
        answer: 0,
        explanation: "Smaller f-numbers mean a wider opening, so more light.",
      },
      {
        prompt: "What does a histogram piled up against the right edge usually mean?",
        options: ["Highlights are clipped — the photo is overexposed", "The photo is underexposed", "The photo is out of focus", "The colours are accurate"],
        answer: 0,
        explanation: "Data stacked at the right edge means pure white areas with lost detail.",
      },
    ],
  },
  {
    key: "quiz.music.theory",
    kind: "QUIZ",
    skillSlug: "music.theory",
    title: "Music theory check",
    summary: "Notes, intervals, scales and chords.",
    minutes: 6,
    passPercent: 80,
    questions: [
      {
        prompt: "How many semitones are in an octave?",
        options: ["7", "8", "12", "10"],
        answer: 2,
        explanation: "An octave spans 12 semitones.",
      },
      {
        prompt: "Which notes form a C major triad?",
        options: ["C – E – G", "C – E♭ – G", "C – F – A", "C – D – E"],
        answer: 0,
        explanation: "Root, major third and perfect fifth: C, E, G.",
      },
      {
        prompt: "What is the pattern of whole (W) and half (H) steps in a major scale?",
        options: ["W W H W W W H", "W H W W H W W", "H W W W H W W", "W W W H W W H"],
        answer: 0,
        explanation: "Major: W W H W W W H.",
      },
      {
        prompt: "In 4/4 time, how many quarter-note beats are in one bar?",
        options: ["2", "3", "4", "8"],
        answer: 2,
        explanation: "The top number says four beats; the bottom says each is a quarter note.",
      },
      {
        prompt: "What is the relative minor of C major?",
        options: ["A minor", "C minor", "E minor", "G minor"],
        answer: 0,
        explanation: "A minor uses the same notes as C major, starting on A.",
      },
    ],
  },
  {
    key: "quiz.cooking.basics",
    kind: "QUIZ",
    skillSlug: "cooking.basics",
    title: "Kitchen basics check",
    summary: "Safety, heat and technique that make everything else work.",
    minutes: 5,
    passPercent: 80,
    questions: [
      {
        prompt: "Why should you rest a knife hand with the fingers curled (the “claw”)?",
        options: ["It keeps fingertips away from the blade", "It makes cuts thinner", "It keeps the knife sharp", "It warms the food"],
        answer: 0,
        explanation: "The claw guides the blade with your knuckles while fingertips stay tucked away.",
      },
      {
        prompt: "What happens if you crowd too much food into a hot pan?",
        options: ["It steams instead of browning", "It cooks faster", "It burns immediately", "Nothing changes"],
        answer: 0,
        explanation: "Crowding drops the pan temperature and traps moisture, so food steams.",
      },
      {
        prompt: "Which is the safest way to thaw frozen meat?",
        options: ["In the fridge", "On the counter overnight", "In hot water", "In direct sunlight"],
        answer: 0,
        explanation: "The fridge keeps meat out of the temperature range where bacteria grow fast.",
      },
      {
        prompt: "What does “season to taste” ask you to do?",
        options: ["Taste as you go and adjust salt/acid/spice", "Use exactly the recipe amount", "Add seasoning only at the table", "Skip seasoning"],
        answer: 0,
        explanation: "Tasting and adjusting while cooking is what makes food taste finished.",
      },
      {
        prompt: "Why use a separate board for raw meat and vegetables?",
        options: ["To avoid cross-contamination", "To keep flavours separate", "Because meat dulls knives", "It isn't necessary"],
        answer: 0,
        explanation: "Raw meat juices can carry bacteria onto food that won't be cooked.",
      },
    ],
  },
  {
    key: "quiz.business.foundations",
    kind: "QUIZ",
    skillSlug: "business.foundations",
    title: "Business foundations check",
    summary: "Value, customers, revenue and profit.",
    minutes: 5,
    passPercent: 80,
    questions: [
      {
        prompt: "Revenue is 10,000 and costs are 7,000. What is the profit?",
        options: ["3,000", "17,000", "7,000", "10,000"],
        answer: 0,
        explanation: "Profit = revenue − costs.",
      },
      {
        prompt: "What is a value proposition?",
        options: ["Why a specific customer should choose you over alternatives", "The company's share price", "A list of every feature", "The logo and brand colours"],
        answer: 0,
        explanation: "It names the customer, their problem, and why your offer solves it better.",
      },
      {
        prompt: "What is the best early way to test whether people want a product?",
        options: ["Get real people to commit — pre-orders, sign-ups or payments", "Ask friends if they like the idea", "Build every feature first", "Design a logo"],
        answer: 0,
        explanation: "Commitments are evidence; compliments are not.",
      },
      {
        prompt: "What is a fixed cost?",
        options: ["A cost that doesn't change with how much you sell", "A cost that has been paid off", "A cost per unit sold", "A one-time repair"],
        answer: 0,
        explanation: "Rent is fixed; materials per item are variable.",
      },
      {
        prompt: "What does cash flow describe?",
        options: ["When money actually comes in and goes out", "Total profit over the year", "How much the business is worth", "The number of customers"],
        answer: 0,
        explanation: "A profitable business can still fail if cash arrives later than bills are due.",
      },
    ],
  },
];

const practical = (
  key: string,
  skillSlug: string,
  title: string,
  summary: string,
  brief: string,
  deliverable: string,
  criteria: RubricCriterion[],
  minutes = 60,
): PracticalDefinition => ({ key, kind: "PRACTICAL", skillSlug, title, summary, brief, deliverable, criteria, minutes, passPercent: 70 });

const PRACTICALS: readonly PracticalDefinition[] = [
  practical(
    "practical.programming.fundamentals",
    "programming.fundamentals",
    "Build a small working program",
    "Write a program that takes input, makes decisions and repeats work.",
    "Write a small program in any language that asks for (or reads) some input, uses at least one condition and one loop, and uses at least one function you wrote. A to-do list, number guessing game or tip calculator all work.",
    "A link to the code (repository, gist or online editor) and a short description of what it does and one thing that went wrong along the way.",
    [
      { key: "works", label: "It runs and does what it says", description: "The program runs without errors for normal input and produces the described result.", weight: 3 },
      { key: "structure", label: "Uses conditions, loops and functions", description: "Each concept is used for a real purpose, not just included.", weight: 2 },
      { key: "clarity", label: "Readable code", description: "Clear names and structure someone else could follow.", weight: 1 },
      { key: "debugging", label: "Explains a problem solved", description: "Describes a bug or obstacle and how it was worked out.", weight: 1 },
    ],
  ),
  practical(
    "practical.writing.craft",
    "writing.craft",
    "Write and revise a short piece",
    "A finished piece of 500–1,000 words, with evidence of revision.",
    "Write a piece of 500–1,000 words — an essay, story or article. Then revise it at least once with a clear goal (cut 15%, sharpen the opening, fix the structure).",
    "A link to the final piece and a short note on what you changed in revision and why.",
    [
      { key: "complete", label: "A finished piece", description: "It has a clear beginning, middle and end, within the length.", weight: 2 },
      { key: "clarity", label: "Clear sentences", description: "Readers can follow every sentence without rereading.", weight: 2 },
      { key: "voice", label: "A point of view", description: "It says something specific, in a voice of its own.", weight: 1 },
      { key: "revision", label: "Deliberate revision", description: "The revision note names concrete changes and their purpose.", weight: 2 },
    ],
  ),
  practical(
    "practical.photography.composition",
    "photography.composition",
    "Shoot a composed five-photo set",
    "Five photos, each using a named composition technique.",
    "Take five photos around one theme. Use a different composition technique for each — rule of thirds, leading lines, framing, symmetry, negative space or similar — and name it.",
    "A link to the five photos (album or portfolio) with the technique used for each.",
    [
      { key: "techniques", label: "Techniques applied", description: "Each photo clearly shows the technique named for it.", weight: 3 },
      { key: "theme", label: "A coherent set", description: "The five photos belong together.", weight: 1 },
      { key: "exposure", label: "Technically sound", description: "Focus and exposure support the image.", weight: 1 },
      { key: "intent", label: "Explains choices", description: "Describes why each composition suits its subject.", weight: 1 },
    ],
  ),
  practical(
    "practical.fitness.strength",
    "fitness.strength",
    "Run a four-week strength block",
    "A logged training block showing progressive overload.",
    "Follow a simple strength routine for four weeks — at least two sessions a week — and log every session: exercises, sets, reps and weight (or the bodyweight variation).",
    "A link to your training log (spreadsheet, app export or photo of a notebook) and a note on what progressed and how your form held up.",
    [
      { key: "consistency", label: "Consistent training", description: "At least eight logged sessions across the four weeks.", weight: 2 },
      { key: "progression", label: "Progressive overload", description: "Load, reps or difficulty increased over the block.", weight: 3 },
      { key: "logging", label: "Clear log", description: "Every session shows exercises, sets and reps.", weight: 1 },
      { key: "reflection", label: "Honest reflection", description: "Notes what improved, what didn't, and how form and recovery went.", weight: 1 },
    ],
    30,
  ),
  practical(
    "practical.communication.public-speaking",
    "communication.public-speaking",
    "Give a recorded three-minute talk",
    "A structured talk, delivered and reviewed.",
    "Prepare and record a three-minute talk on something you care about, with a clear opening, three points and a close. Watch it back once before submitting.",
    "A link to the recording and a short self-review: what worked, and one thing you'd change.",
    [
      { key: "structure", label: "Clear structure", description: "Opening, distinct points and a deliberate close.", weight: 2 },
      { key: "delivery", label: "Delivery", description: "Pace, volume and eye contact help the message.", weight: 2 },
      { key: "time", label: "Within time", description: "Around three minutes, without rushing.", weight: 1 },
      { key: "review", label: "Useful self-review", description: "Names specific strengths and a concrete improvement.", weight: 1 },
    ],
    45,
  ),
  practical(
    "practical.languages.speaking",
    "languages.speaking",
    "Record a two-minute self-introduction",
    "Speak about yourself in your target language without reading.",
    "Record yourself speaking for two minutes in the language you're learning: who you are, what you do, what you enjoy, and a plan for next weekend. Don't read from a script.",
    "A link to the recording, plus a transcript or summary and the language you used.",
    [
      { key: "fluency", label: "Keeps going", description: "Speaks for about two minutes with few long pauses.", weight: 2 },
      { key: "range", label: "Covers the topics", description: "Talks about self, activities, interests and a future plan.", weight: 2 },
      { key: "accuracy", label: "Understandable", description: "A native speaker would follow it despite mistakes.", weight: 2 },
      { key: "unscripted", label: "Unscripted", description: "Clearly spoken, not read aloud.", weight: 1 },
    ],
    30,
  ),
];

/** Generic criteria for demonstrating any skill through a finished project. */
const PROJECT_CRITERIA: readonly RubricCriterion[] = [
  { key: "real", label: "A real, finished piece of work", description: "Something that exists and could be shown to someone else.", weight: 3 },
  { key: "application", label: "Clearly uses this skill", description: "The skill is central to the work, not incidental.", weight: 3 },
  { key: "evidence", label: "Evidence supports it", description: "Links, files or write-ups let someone verify what was made.", weight: 2 },
  { key: "reflection", label: "Reflects on the work", description: "Names what was hard, what was learned, and what comes next.", weight: 1 },
];

export const PROJECT_ASSESSMENT_PREFIX = "project.";

/** Any skill can be demonstrated through a completed project. */
export function projectAssessmentFor(skill: Pick<SkillStateRow, "slug" | "name">): ProjectAssessmentDefinition {
  return {
    key: `${PROJECT_ASSESSMENT_PREFIX}${skill.slug}`,
    kind: "PROJECT",
    skillSlug: skill.slug,
    title: `${skill.name}: project review`,
    summary: `Show ${skill.name.toLowerCase()} through something you actually built or made.`,
    brief: `Choose a completed project that used ${skill.name}. Explain what you made, how ${skill.name.toLowerCase()} was used in it, and what you'd do differently next time.`,
    criteria: PROJECT_CRITERIA,
    minutes: 15,
    passPercent: 70,
  };
}

export const ASSESSMENT_CATALOGUE: readonly AssessmentDefinition[] = [...QUIZZES, ...PRACTICALS];

export function findCatalogueAssessment(key: string): AssessmentDefinition | undefined {
  return ASSESSMENT_CATALOGUE.find((definition) => definition.key === key);
}

/** The skill slug a project-assessment key refers to, or null for other keys. */
export function projectAssessmentSkillSlug(key: string): string | null {
  return key.startsWith(PROJECT_ASSESSMENT_PREFIX) ? key.slice(PROJECT_ASSESSMENT_PREFIX.length) : null;
}
