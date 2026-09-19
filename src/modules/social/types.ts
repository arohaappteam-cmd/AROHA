import type { AvatarStyle, LifeArea } from "@/generated/prisma/enums";
import type { AvatarColor, AvatarEmblem } from "@/modules/identity/avatar";

/**
 * The community layer (spec §44–46) is a demonstration: the people, guilds
 * and group challenges below are seeded sample data, not real accounts. They
 * exist so the shape of the social experience can be designed and felt before
 * real multi-user support exists.
 *
 * Everything the app reads about other people goes through `SocialDirectory`
 * (directory.ts). Swapping the seeded implementation for one backed by real
 * users is the whole job of making this real — no page or service knows where
 * a person came from.
 */

export type SocialAvatar = { style: AvatarStyle; color: AvatarColor; emblem: AvatarEmblem };

/** How far along a member is in a skill, as their own passport would show it. */
export type PersonSkill = {
  treeSlug: string;
  label: string;
  level: number;
  maxLevel: number;
  /** Mirrors the proof tiers in modules/proof. */
  proof: "practiced" | "tested" | "demonstrated" | "mastered";
};

export type MentorTier = "beginner" | "mentor" | "expert";

export type SocialPerson = {
  /** Stable id used in URLs. Seeded people are prefixed "demo-" nowhere: the handle is the id. */
  handle: string;
  displayName: string;
  pronouns: string | null;
  /** City-level only — the demo never invents precise locations. */
  location: string;
  avatar: SocialAvatar;
  headline: string;
  /** A couple of sentences in their own voice. */
  about: string;
  joinedDaysAgo: number;
  totalXp: number;
  /** XP in the last 28 days and the 28 before it — the same windows the user sees. */
  xpRecent: number;
  xpPrevious: number;
  questsRecent: number;
  achievements: number;
  challengesCompleted: number;
  /** Goals they're working on, for shared-ground and mentorship matching. */
  goals: { title: string; lifeArea: LifeArea; percent: number }[];
  interests: string[];
  focusAreas: LifeArea[];
  skills: PersonSkill[];
  guilds: string[];
  tier: MentorTier;
  /** Skill trees they can mentor in. Empty for beginners. */
  mentorsIn: string[];
  openToMentoring: boolean;
  seekingMentorIn: string[];
  /** Handles they are mentored by / mentoring, forming the expert → mentor → beginner chain. */
  mentoredBy: string[];
  mentoring: string[];
  /** What they'd tell someone starting out — shown on their profile, not a feed post. */
  note: string;
};

export type Guild = {
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  lifeArea: LifeArea;
  /** The skill tree the guild practises, when one fits. */
  skillTree: string | null;
  /** Interests that suggest this guild to someone. */
  interests: string[];
  /** What members actually do together, weekly. Not a chat room. */
  ritual: { title: string; detail: string };
  /** How the guild expects people to treat each other. */
  norms: string[];
  memberCount: number;
};

export type GroupChallenge = {
  key: string;
  guildSlug: string;
  title: string;
  emoji: string;
  description: string;
  /** The personal challenge template joining this starts (modules/challenges). */
  templateKey: string;
  /** Days since the group's window opened, so the demo always looks live. */
  startedDaysAgo: number;
  durationDays: number;
  targetDays: number;
  /** Seeded members taking part, with the days they've earned. */
  participants: { handle: string; daysDone: number }[];
};
