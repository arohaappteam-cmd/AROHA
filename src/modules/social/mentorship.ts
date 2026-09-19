import { sharedInterests, type ViewerContext } from "./matching";
import type { MentorTier, SocialPerson } from "./types";

/**
 * Mentorship (spec §46) as a chain rather than a hierarchy: an expert mentors
 * a mentor, who mentors a beginner. Almost everyone is somewhere in the
 * middle, which is the point — you don't have to be an expert to be useful to
 * someone a few steps behind you.
 */

/** The level at which someone has enough of a skill to help a beginner with it. */
export const MENTOR_MIN_LEVEL = 3;
/** Where "expert" starts, for the viewer's own standing. */
export const EXPERT_MIN_LEVEL = 7;

export const TIER_META: Record<MentorTier, { label: string; description: string }> = {
  beginner: { label: "Beginner", description: "Early in this practice, and better served by someone a few steps ahead than by an expert." },
  mentor: { label: "Mentor", description: "Far enough along to help someone starting out, still learning from someone ahead." },
  expert: { label: "Expert", description: "Deep in the practice, and mostly useful to people who already have the basics." },
};

/** The viewer's own standing, from the skills they've actually built. */
export function viewerTier(skillLevels: readonly { treeSlug: string; level: number }[]): MentorTier {
  const best = skillLevels.reduce((highest, skill) => Math.max(highest, skill.level), 0);
  if (best >= EXPERT_MIN_LEVEL) return "expert";
  if (best >= MENTOR_MIN_LEVEL) return "mentor";
  return "beginner";
}

/** Skill trees the viewer could mentor someone in today. */
export function canMentorIn(skillLevels: readonly { treeSlug: string; level: number }[]): string[] {
  return [...new Set(skillLevels.filter((skill) => skill.level >= MENTOR_MIN_LEVEL).map((skill) => skill.treeSlug))];
}

export type MentorMatch = { person: SocialPerson; reasons: string[]; score: number; topics: string[] };

function treeLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/^./, (character) => character.toUpperCase());
}

/**
 * Mentors worth asking. Someone one or two steps ahead of the viewer ranks
 * above a distant expert — the near-peer is usually the more useful match.
 */
export function findMentors(viewer: ViewerContext, people: readonly SocialPerson[], viewerLevel: MentorTier): MentorMatch[] {
  const matches: MentorMatch[] = [];

  for (const person of people) {
    if (!person.openToMentoring || person.mentorsIn.length === 0) continue;
    const reasons: string[] = [];
    let score = 0;

    const trees = person.mentorsIn.filter((tree) => viewer.skillTrees.includes(tree));
    if (trees.length > 0) {
      score += trees.length * 4;
      reasons.push(`Mentors in ${trees.map(treeLabel).join(", ")}, which you're building`);
    }

    const interests = sharedInterests(viewer.interests, person.interests);
    if (interests.length > 0) {
      score += interests.length * 2;
      reasons.push(`Shares your interest in ${interests.slice(0, 2).join(" and ")}`);
    }

    const areas = person.focusAreas.filter((area) => viewer.goalAreas.includes(area) || viewer.focusAreas.includes(area));
    if (areas.length > 0) {
      score += areas.length;
      reasons.push("Works in the same areas of life as you");
    }

    // A near-peer knows what the last step felt like.
    if (viewerLevel === "beginner" && person.tier === "mentor") {
      score += 3;
      reasons.push("A couple of years ahead of you, not ten — usually the more useful gap");
    }
    if (viewerLevel === "mentor" && person.tier === "expert") {
      score += 3;
      reasons.push("Far enough ahead to stretch you");
    }

    if (score === 0) continue;
    matches.push({
      person,
      reasons,
      score,
      topics: (trees.length > 0 ? trees : person.mentorsIn).map(treeLabel),
    });
  }

  return matches.sort((a, b) => b.score - a.score || a.person.displayName.localeCompare(b.person.displayName));
}

export type MenteeMatch = { person: SocialPerson; reasons: string[]; topics: string[] };

/** Beginners asking for help in something the viewer has actually built. */
export function findMentees(people: readonly SocialPerson[], viewerCanMentorIn: readonly string[]): MenteeMatch[] {
  if (viewerCanMentorIn.length === 0) return [];
  return people.flatMap((person) => {
    const trees = person.seekingMentorIn.filter((tree) => viewerCanMentorIn.includes(tree));
    if (trees.length === 0 || person.mentoredBy.length > 0) return [];
    return [
      {
        person,
        topics: trees.map(treeLabel),
        reasons: [`Looking for help with ${trees.map(treeLabel).join(" and ")}`, `${person.tier === "beginner" ? "Just starting out" : "Still finding their footing"} — ${person.joinedDaysAgo} days in`],
      },
    ];
  });
}

export type MentorshipChain = { expert: SocialPerson; mentor: SocialPerson; beginner: SocialPerson };

/** Expert → mentor → beginner chains, read from who mentors whom. */
export function mentorshipChains(people: readonly SocialPerson[]): MentorshipChain[] {
  const byHandle = new Map(people.map((person) => [person.handle, person]));
  const chains: MentorshipChain[] = [];

  for (const expert of people) {
    if (expert.tier !== "expert") continue;
    for (const mentorHandle of expert.mentoring) {
      const mentor = byHandle.get(mentorHandle);
      if (!mentor) continue;
      for (const beginnerHandle of mentor.mentoring) {
        const beginner = byHandle.get(beginnerHandle);
        if (beginner) chains.push({ expert, mentor, beginner });
      }
    }
  }
  return chains;
}

/**
 * What a new mentorship actually consists of. Seeded and deterministic: the
 * demo never pretends a message was answered by a real person, it just shows
 * how a mentorship would be set up.
 */
export function startingPlan(topic: string, role: "MENTEE" | "MENTOR"): string[] {
  return role === "MENTEE"
    ? [
        `Say where you are with ${topic} today, in one honest paragraph.`,
        "Agree on one thing to have done before your next conversation — small enough to finish this week.",
        "Bring the work itself next time, not a summary of it.",
      ]
    : [
        `Ask what they've already tried with ${topic} before suggesting anything.`,
        "Help them pick one next step, and make it smaller than feels right.",
        "Check in once, at a time you both agreed. Chasing is not mentoring.",
      ];
}
