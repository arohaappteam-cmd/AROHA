import type { GroupChallenge, GuildDefinition } from "./types";

/**
 * Guilds (spec §45): small groups around one kind of practice. A guild is a
 * shared ritual and a place to find people who do the thing you're trying to
 * do — deliberately not a chat room or a feed.
 */
export const GUILDS: readonly GuildDefinition[] = [
  {
    slug: "fitness",
    name: "Fitness Guild",
    emoji: "💪",
    tagline: "Bodies that carry us through the rest of it.",
    description:
      "Runners, lifters, climbers and people who are just trying to move most days. Nobody here cares how fast you are — only that you showed up in a way that fits your life.",
    lifeArea: "PHYSICAL",
    skillTree: "fitness",
    interests: ["Strength training", "Running", "Yoga", "Hiking", "Swimming", "Cycling", "Martial arts", "Getting fit"],
    ritual: { title: "Monday reset", detail: "Everyone posts the one movement they're committing to this week — a distance, a session count, a single walk." },
    norms: ["Progress is measured against your own last month, never against another member.", "No before-and-after photos.", "A missed week is not a confession."],
  },
  {
    slug: "coding",
    name: "Coding Guild",
    emoji: "💻",
    tagline: "Build the thing. Then build the next thing.",
    description:
      "Self-taught developers, career switchers and people building small tools for their own lives. The guild exists to turn tutorials into finished projects with someone watching.",
    lifeArea: "LEARNING",
    skillTree: "programming",
    interests: ["Programming", "Building something", "Science", "Entrepreneurship"],
    ritual: { title: "Ship Friday", detail: "Show one thing that runs — however small, however ugly. Half-finished counts if it does something." },
    norms: ["Show the work, not the résumé.", "Questions at any level are welcome.", "Nobody is asked to justify the language they chose."],
  },
  {
    slug: "reading",
    name: "Reading Guild",
    emoji: "📖",
    tagline: "Pages, most days.",
    description:
      "A guild for people who want reading back in their life — not a book club with homework. Members read different books at their own pace and meet around the habit itself.",
    lifeArea: "LEARNING",
    skillTree: null,
    interests: ["Psychology", "History", "Philosophy", "Science", "Writing a book", "Economics"],
    ritual: { title: "One page Sunday", detail: "Share one passage that stayed with you this week, and why. One passage — not a review." },
    norms: ["No page-count competitions.", "Abandoning a book is a valid outcome.", "Audiobooks count."],
  },
  {
    slug: "music",
    name: "Music Guild",
    emoji: "🎵",
    tagline: "Practice, however brief.",
    description:
      "Instrument learners, returning players and bedroom producers. Most members are beginners, and the guild is built around keeping practice short enough to actually happen.",
    lifeArea: "CREATIVITY",
    skillTree: "music",
    interests: ["Music", "Learning an instrument", "Live music", "Film"],
    ritual: { title: "Ten-minute Tuesday", detail: "Ten minutes of deliberate practice, then a note on what was hard about it." },
    norms: ["Recordings are optional, always.", "Scales count as music.", "Comparison to people who started at six is off the table."],
  },
  {
    slug: "mindfulness",
    name: "Mindfulness Guild",
    emoji: "🧘",
    tagline: "Room to breathe, on ordinary days.",
    description:
      "Meditation, breathwork and the quieter end of mental practice. The guild is intentionally slow: there is nothing here to keep up with.",
    lifeArea: "MENTAL",
    skillTree: null,
    interests: ["Meditation", "Mindfulness", "Journaling", "Breathwork", "Better sleep", "Stoicism"],
    ritual: { title: "Quiet Wednesday", detail: "One sitting, any length, sometime on Wednesday. Members mark the day, not the minutes." },
    norms: ["No streak pressure — restarting is the practice.", "This is not therapy and nobody plays therapist.", "Silence in the guild is fine."],
  },
  {
    slug: "makers",
    name: "Makers Guild",
    emoji: "🎨",
    tagline: "Something that didn't exist this morning.",
    description:
      "Drawing, photography, writing, cooking, woodwork — anyone who makes things with their hands or their eyes. Finished beats good.",
    lifeArea: "CREATIVITY",
    skillTree: "art",
    interests: ["Drawing", "Photography", "Writing", "Design", "Cooking", "Woodworking", "Film"],
    ritual: { title: "Rough drafts welcome", detail: "Share one unfinished thing a week. Feedback only if it's asked for." },
    norms: ["Unsolicited critique is not a gift.", "Process over portfolio.", "Making badly is how making starts."],
  },
];

export function findGuild(slug: string): GuildDefinition | undefined {
  return GUILDS.find((guild) => guild.slug === slug);
}

/**
 * Group challenges (spec §46): the same challenge, attempted alongside other
 * people. Joining one starts the member's *own* challenge from the normal
 * template — days are still earned by real quests, and nobody's progress
 * depends on anyone else's. Each person's window opens the day they join;
 * the group is whoever is running it at the same time.
 */
export const GROUP_CHALLENGES: readonly GroupChallenge[] = [
  {
    key: "fitness-30-autumn",
    guildSlug: "fitness",
    title: "Thirty days of moving",
    emoji: "💪",
    description: "A month of movement, together. Most days is the target — not every day.",
    templateKey: "fitness-30",
    durationDays: 30,
    targetDays: 21,
  },
  {
    key: "coding-14-build",
    guildSlug: "coding",
    title: "Two weeks of building",
    emoji: "💻",
    description: "Fourteen days, one small project each. Ship something that runs by the end.",
    templateKey: "coding-14",
    durationDays: 14,
    targetDays: 10,
  },
  {
    key: "reading-7-sprint",
    guildSlug: "reading",
    title: "A week of pages",
    emoji: "📖",
    description: "Seven days, a real reading session on most of them. Any book, any format.",
    templateKey: "reading-7",
    durationDays: 7,
    targetDays: 5,
  },
  {
    key: "meditation-21-quiet",
    guildSlug: "mindfulness",
    title: "Twenty-one quiet days",
    emoji: "🧘",
    description: "Three weeks of sitting, most days. Two minutes counts.",
    templateKey: "meditation-21",
    durationDays: 21,
    targetDays: 15,
  },
  {
    key: "create-48h-makers",
    guildSlug: "makers",
    title: "Forty-eight hours, one thing",
    emoji: "🎨",
    description: "Make something small from start to finish in two days. Rough is the point.",
    templateKey: "create-48h",
    durationDays: 2,
    targetDays: 2,
  },
];

export function findGroupChallenge(key: string): GroupChallenge | undefined {
  return GROUP_CHALLENGES.find((challenge) => challenge.key === key);
}
