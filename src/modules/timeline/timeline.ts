import { levelForXp, tierForLevel } from "@/modules/progression/levels";
import { skillLevelForXp } from "@/modules/skills/levels";

/**
 * The Life Timeline (spec §43): a chronological record of meaningful growth
 * — "the story of the user's growth". Events are derived from records that
 * already exist; nothing is stored twice. Journal entries are never included.
 */

export const TIMELINE_KINDS = [
  "goal",
  "project",
  "achievement",
  "challenge",
  "skill",
  "experience",
  "experiment",
  "level",
] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export const TIMELINE_KIND_META: Record<TimelineKind, { label: string; plural: string }> = {
  goal: { label: "Goal", plural: "Goals" },
  project: { label: "Project", plural: "Projects" },
  achievement: { label: "Achievement", plural: "Achievements" },
  challenge: { label: "Challenge", plural: "Challenges" },
  skill: { label: "Skill milestone", plural: "Skills" },
  experience: { label: "Experience", plural: "Experiences" },
  experiment: { label: "Experiment", plural: "Experiments" },
  level: { label: "Level", plural: "Levels" },
};

export type TimelineEvent = {
  id: string;
  kind: TimelineKind;
  date: Date;
  title: string;
  detail: string;
  emoji: string;
  href?: string;
  /** Major events get more visual weight. */
  major: boolean;
};

// ─── Skill milestones from the skill ledger ─────────────────────────────────

export type SkillLedgerRow = { skillId: string; amount: number; createdAt: Date };
export type SkillCurve = { id: string; name: string; baseXp: number; maxLevel: number; treeSlug: string; treeEmoji: string };

/**
 * Replays each skill's XP in order and emits the moments it crossed a
 * meaningful level: starting it (level 1), level 3, and its top level.
 * Levels in between are real, but not timeline-worthy.
 */
export function skillMilestoneEvents(rows: readonly SkillLedgerRow[], skills: readonly SkillCurve[]): TimelineEvent[] {
  const bySkill = new Map(skills.map((skill) => [skill.id, skill]));
  const totals = new Map<string, number>();
  const events: TimelineEvent[] = [];

  for (const row of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const skill = bySkill.get(row.skillId);
    if (!skill) continue;
    const before = totals.get(skill.id) ?? 0;
    const after = before + row.amount;
    totals.set(skill.id, after);

    const from = skillLevelForXp(skill.baseXp, skill.maxLevel, before);
    const to = skillLevelForXp(skill.baseXp, skill.maxLevel, after);
    for (let level = from + 1; level <= to; level++) {
      const top = level === skill.maxLevel;
      if (level !== 1 && level !== 3 && !top) continue;
      events.push({
        id: `skill-${skill.id}-${level}`,
        kind: "skill",
        date: row.createdAt,
        title: level === 1 ? `Started ${skill.name}` : top ? `Reached the top level of ${skill.name}` : `${skill.name} reached level 3`,
        detail: top ? "Practice complete — mastery is confirmed through an assessment" : `Level ${level} of ${skill.maxLevel}`,
        emoji: skill.treeEmoji,
        href: `/skills/${skill.treeSlug}`,
        major: top,
      });
    }
  }
  return events;
}

// ─── Character levels from the XP ledger ────────────────────────────────────

/** Tier changes and every fifth level, replayed from the XP ledger. */
export function characterLevelEvents(rows: readonly { amount: number; createdAt: Date }[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let total = 0;
  for (const row of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const from = levelForXp(total);
    total += row.amount;
    const to = levelForXp(total);
    for (let level = from + 1; level <= to; level++) {
      const tierChanged = tierForLevel(level) !== tierForLevel(level - 1);
      if (!tierChanged && level % 5 !== 0) continue;
      events.push({
        id: `level-${level}`,
        kind: "level",
        date: row.createdAt,
        title: tierChanged ? `Became ${tierForLevel(level)}` : `Reached level ${level}`,
        detail: tierChanged ? `Level ${level} — a new chapter of your character` : "Character level",
        emoji: tierChanged ? "🌟" : "⬆️",
        href: "/character",
        major: tierChanged,
      });
    }
  }
  return events;
}

// ─── Grouping ────────────────────────────────────────────────────────────────

export type TimelineMonth = { key: string; label: string; events: TimelineEvent[] };
export type TimelineYear = { year: number; months: TimelineMonth[]; count: number; highlights: TimelineEvent[] };

const monthFormat = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" });

/**
 * Newest first, grouped year → month in the user's timezone. Each year keeps
 * its major events as highlights — the "2026: learned Python, built an app"
 * summary from the spec.
 */
export function groupTimeline(events: readonly TimelineEvent[], timezone: string): TimelineYear[] {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" });
  const sorted = [...events].sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));

  const years: TimelineYear[] = [];
  for (const event of sorted) {
    const [year, month] = parts.format(event.date).split("-").map(Number);
    let bucket = years.find((entry) => entry.year === year);
    if (!bucket) {
      bucket = { year, months: [], count: 0, highlights: [] };
      years.push(bucket);
    }
    const key = `${year}-${String(month).padStart(2, "0")}`;
    let monthBucket = bucket.months.find((entry) => entry.key === key);
    if (!monthBucket) {
      monthBucket = { key, label: monthFormat.format(new Date(Date.UTC(year, month - 1, 1))), events: [] };
      bucket.months.push(monthBucket);
    }
    monthBucket.events.push(event);
    bucket.count += 1;
    if (event.major) bucket.highlights.push(event);
  }
  return years;
}

export function filterTimeline(events: readonly TimelineEvent[], kinds: ReadonlySet<TimelineKind>): TimelineEvent[] {
  return kinds.size === 0 ? [...events] : events.filter((event) => kinds.has(event.kind));
}
