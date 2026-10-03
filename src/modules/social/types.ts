import type { AvatarStyle, LifeArea } from "@/generated/prisma/enums";
import type { AvatarColor, AvatarEmblem } from "@/modules/identity/avatar";

/**
 * The community layer (spec §44–46): real members who chose to be visible.
 *
 * Everything the app reads about other people goes through `SocialDirectory`
 * (directory.ts), and only members whose profile is set to COMMUNITY are ever
 * returned. Each part of a person's record is present only when they chose to
 * share it — a `null` here means "they keep this private", never "zero".
 */

export type SocialAvatar = { style: AvatarStyle; color: AvatarColor; emblem: AvatarEmblem };

/** How far along a member is in one skill tree: their strongest skill in it. */
export type PersonSkill = {
  treeSlug: string;
  label: string;
  level: number;
  maxLevel: number;
};

export type MentorTier = "beginner" | "mentor" | "expert";

/** Level and recent activity, shared with "Level and XP". */
export type PersonProgress = {
  totalXp: number;
  /** XP in the last 28 days and the 28 before it — the same windows the viewer sees. */
  xpRecent: number;
  xpPrevious: number;
  questsRecent: number;
};

/** Shared with "Achievements". */
export type PersonRecord = { achievements: number; challengesCompleted: number };

export type SocialPerson = {
  /** Public, stable id used in URLs. */
  handle: string;
  displayName: string;
  pronouns: string | null;
  avatar: SocialAvatar;
  /** One line in their own words, or "" when they haven't written one. */
  headline: string;
  /** Their bio, or "". */
  about: string;
  /** Their character motto, or "". */
  note: string;
  joinedDaysAgo: number;
  progress: PersonProgress | null;
  record: PersonRecord | null;
  interests: string[];
  focusAreas: LifeArea[];
  /** Empty when they don't share skills. */
  skills: PersonSkill[];
  guilds: string[];
  /** Read from skills they've built, whether or not they share the details. */
  tier: MentorTier;
  /** Skill trees they can mentor in. Empty unless they're open to mentoring. */
  mentorsIn: string[];
  openToMentoring: boolean;
  seekingMentorIn: string[];
  /** Handles of members in an active mentorship with them, both directions. */
  mentoredBy: string[];
  mentoring: string[];
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
  /** Everyone who joined, visible or not. A count names nobody. */
  memberCount: number;
};

/** The curated part of a guild; the member count is read live. */
export type GuildDefinition = Omit<Guild, "memberCount">;

export type GroupChallenge = {
  key: string;
  guildSlug: string;
  title: string;
  emoji: string;
  description: string;
  /** The personal challenge template joining this starts (modules/challenges). */
  templateKey: string;
  durationDays: number;
  targetDays: number;
};

/** Someone taking part in a group challenge, with the days they've earned. */
export type GroupParticipant = { person: SocialPerson; daysDone: number };
