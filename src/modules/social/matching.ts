import type { LifeArea } from "@/generated/prisma/enums";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { interestSlug } from "@/modules/identity/interests";

import type { Guild, SocialPerson } from "./types";

/**
 * Shared ground, not a recommendation engine. Matches are explained in full —
 * every suggestion carries the reasons it was made, so the user can see that
 * discovery is "you both do this", never an opaque ranking.
 */

/** What the app knows about the viewer for matching. Nothing private is used. */
export type ViewerContext = {
  interests: string[];
  focusAreas: LifeArea[];
  /** Life areas the viewer has active goals in. */
  goalAreas: LifeArea[];
  /** Skill trees the viewer has made progress in, strongest first. */
  skillTrees: string[];
  guilds: string[];
};

export const EMPTY_VIEWER: ViewerContext = { interests: [], focusAreas: [], goalAreas: [], skillTrees: [], guilds: [] };

/** Interests held in common, in the viewer's own words. Case and punctuation don't matter. */
export function sharedInterests(viewerInterests: readonly string[], others: readonly string[]): string[] {
  const theirs = new Set(others.map(interestSlug));
  return viewerInterests.filter((interest) => theirs.has(interestSlug(interest)));
}

function listOf(items: readonly string[], max = 3): string {
  const shown = items.slice(0, max);
  if (shown.length <= 1) return shown[0] ?? "";
  return `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
}

export type Match<T> = { subject: T; score: number; reasons: string[] };
export type PersonMatch = Match<SocialPerson>;

/**
 * Ranks people by how much real ground the viewer shares with them. Shared
 * interests count most; being able to help each other counts too.
 */
export function rankPeople(viewer: ViewerContext, people: readonly SocialPerson[]): PersonMatch[] {
  const matches: PersonMatch[] = [];

  for (const person of people) {
    const reasons: string[] = [];
    let score = 0;

    const interests = sharedInterests(viewer.interests, person.interests);
    if (interests.length > 0) {
      score += interests.length * 3;
      reasons.push(`You both like ${listOf(interests)}`);
    }

    const guilds = person.guilds.filter((slug) => viewer.guilds.includes(slug));
    if (guilds.length > 0) {
      score += guilds.length * 2;
      reasons.push(`In your ${listOf(guilds.map((slug) => slug.replace(/^./, (c) => c.toUpperCase())))} guild`);
    }

    const areas = person.focusAreas.filter((area) => viewer.focusAreas.includes(area));
    if (areas.length > 0) {
      score += areas.length;
      reasons.push(`Also focused on ${listOf(areas.map((area) => LIFE_AREAS[area].label.toLowerCase()))}`);
    }

    const goalAreas = person.goals.map((goal) => goal.lifeArea).filter((area) => viewer.goalAreas.includes(area));
    if (goalAreas.length > 0) {
      score += goalAreas.length;
      reasons.push(`Working toward a ${LIFE_AREAS[goalAreas[0]].label.toLowerCase()} goal too`);
    }

    const canHelp = person.mentorsIn.filter((tree) => viewer.skillTrees.includes(tree));
    if (canHelp.length > 0 && person.openToMentoring) {
      score += 2;
      reasons.push(`Mentors in ${listOf(canHelp.map(treeLabel))}, which you're building`);
    }

    const couldLearn = person.seekingMentorIn.filter((tree) => viewer.skillTrees.includes(tree));
    if (couldLearn.length > 0) {
      score += 1;
      reasons.push(`Looking for help with ${listOf(couldLearn.map(treeLabel))}`);
    }

    if (score > 0) matches.push({ subject: person, score, reasons });
  }

  return matches.sort((a, b) => b.score - a.score || a.subject.displayName.localeCompare(b.subject.displayName));
}

/** Falls back to a varied sample when the viewer has told AROHA nothing yet. */
export function discoverPeople(viewer: ViewerContext, people: readonly SocialPerson[], limit = 6): PersonMatch[] {
  const ranked = rankPeople(viewer, people);
  if (ranked.length >= limit) return ranked.slice(0, limit);

  const seen = new Set(ranked.map((match) => match.subject.handle));
  const rest = people
    .filter((person) => !seen.has(person.handle))
    .map((person): PersonMatch => ({ subject: person, score: 0, reasons: ["New to you — add interests to see people who share them"] }));
  return [...ranked, ...rest].slice(0, limit);
}

function treeLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/^./, (character) => character.toUpperCase());
}

export type GuildMatch = Match<Guild>;

/** Guilds worth joining, and why. Guilds the viewer is already in are excluded by the caller. */
export function rankGuilds(viewer: ViewerContext, guilds: readonly Guild[]): GuildMatch[] {
  return guilds
    .map((guild): GuildMatch => {
      const reasons: string[] = [];
      let score = 0;

      const interests = sharedInterests(viewer.interests, guild.interests);
      if (interests.length > 0) {
        score += interests.length * 3;
        reasons.push(`Matches your interest in ${listOf(interests)}`);
      }
      if (viewer.focusAreas.includes(guild.lifeArea)) {
        score += 2;
        reasons.push(`${LIFE_AREAS[guild.lifeArea].label} is one of your focus areas`);
      }
      if (guild.skillTree && viewer.skillTrees.includes(guild.skillTree)) {
        score += 2;
        reasons.push(`You're already building ${treeLabel(guild.skillTree)} skills`);
      }
      if (viewer.goalAreas.includes(guild.lifeArea)) {
        score += 1;
        reasons.push(`You have a ${LIFE_AREAS[guild.lifeArea].label.toLowerCase()} goal`);
      }
      return { subject: guild, score, reasons };
    })
    .sort((a, b) => b.score - a.score || b.subject.memberCount - a.subject.memberCount);
}
