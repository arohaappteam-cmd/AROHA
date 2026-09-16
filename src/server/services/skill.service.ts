import "server-only";

import type { LifeArea } from "@/generated/prisma/enums";
import { isAwardableXp } from "@/modules/progression/awards";
import { getSkillProgress, skillLevelLabel } from "@/modules/skills/levels";
import { matchQuestToSkill } from "@/modules/skills/matching";
import type { SkillAwardOutcome } from "@/modules/skills/outcome";
import {
  buildSkillTree,
  flattenTree,
  frontierSkill,
  resolveAwardTarget,
  summarizeTree,
  unlockedBetween,
  type SkillNode,
  type SkillRequirement,
  type SkillTreeSummary,
} from "@/modules/skills/state";
import { db } from "@/server/db";
import { syncSkillCatalogue } from "@/server/db/skill-sync";
import { identityRepository } from "@/server/repositories/identity.repository";
import { skillRepository } from "@/server/repositories/skill.repository";

/**
 * The skill system (spec §15–16). Sits beside the progression engine: quests
 * report completions here, the service routes them into a skill tree, and all
 * progress lands in an append-only ledger — never written by generators or AI.
 */

// ─── Catalogue ───────────────────────────────────────────────────────────────

let catalogueReady: Promise<void> | null = null;

/** Syncs the built-in catalogue once per server process; safe to await anywhere. */
export function ensureSkillCatalogue(): Promise<void> {
  catalogueReady ??= syncSkillCatalogue(db).catch((error) => {
    catalogueReady = null;
    throw error;
  });
  return catalogueReady;
}

// ─── Views ───────────────────────────────────────────────────────────────────

export type SkillHistoryEntry = {
  id: string;
  amount: number;
  reason: string;
  sourceType: string;
  createdAt: Date;
  skill: { slug: string; name: string };
  tree: { slug: string; name: string; emoji: string };
};

export type SkillTreeCard = {
  slug: string;
  name: string;
  emoji: string;
  description: string | null;
  lifeArea: LifeArea;
  summary: SkillTreeSummary;
  /** Where the user currently is in this tree, if anywhere. */
  frontier: { slug: string; name: string; level: number; maxLevel: number; levelLabel: string; percent: number; started: boolean } | null;
  /** The nearest gated skill — what working this tree opens next. */
  nextUnlock: { name: string; requirement: SkillRequirement } | null;
};

export type SkillsOverview = {
  trees: SkillTreeCard[];
  totals: {
    /** Skills at level 1 or above — what the user knows. */
    known: number;
    learning: number;
    availableNext: number;
    mastered: number;
    totalXp: number;
  };
  recent: SkillHistoryEntry[];
};

export type SkillTreeDetail = {
  tree: { slug: string; name: string; emoji: string; description: string | null; lifeArea: LifeArea };
  nodes: SkillNode[];
  summary: SkillTreeSummary;
  history: SkillHistoryEntry[];
};

type TransactionRow = Awaited<ReturnType<typeof skillRepository.listRecentTransactions>>[number];

function toHistoryEntry(row: TransactionRow): SkillHistoryEntry {
  return {
    id: row.id,
    amount: row.amount,
    reason: row.reason,
    sourceType: row.sourceType,
    createdAt: row.createdAt,
    skill: { slug: row.skill.slug, name: row.skill.name },
    tree: row.skill.tree,
  };
}

export async function getSkillsOverview(userId: string): Promise<SkillsOverview> {
  await ensureSkillCatalogue();
  const [trees, xpBySkill, recent] = await Promise.all([
    skillRepository.listTrees(),
    skillRepository.xpBySkill(userId),
    skillRepository.listRecentTransactions(userId, 8),
  ]);

  const totals = { known: 0, learning: 0, availableNext: 0, mastered: 0, totalXp: 0 };
  const cards = trees.map((tree): SkillTreeCard => {
    const nodes = buildSkillTree(tree.skills, xpBySkill);
    const flat = flattenTree(nodes);
    const summary = summarizeTree(nodes);
    totals.known += flat.filter((node) => node.progress.level >= 1).length;
    totals.learning += summary.learning;
    totals.availableNext += summary.available;
    totals.mastered += summary.mastered;
    totals.totalXp += summary.xp;

    const frontier = frontierSkill(nodes);
    const nextLocked = flat.find((node) => node.status === "LOCKED" && node.requirement) ?? null;
    return {
      slug: tree.slug,
      name: tree.name,
      emoji: tree.emoji,
      description: tree.description,
      lifeArea: tree.lifeArea,
      summary,
      frontier: frontier
        ? {
            slug: frontier.slug,
            name: frontier.name,
            level: frontier.progress.level,
            maxLevel: frontier.maxLevel,
            levelLabel: skillLevelLabel(frontier.progress.level, frontier.maxLevel),
            percent: frontier.progress.percent,
            started: frontier.status === "IN_PROGRESS",
          }
        : null,
      nextUnlock: nextLocked ? { name: nextLocked.name, requirement: nextLocked.requirement! } : null,
    };
  });

  return { trees: cards, totals, recent: recent.map(toHistoryEntry) };
}

export async function getSkillTreeDetail(userId: string, treeSlug: string): Promise<SkillTreeDetail | null> {
  await ensureSkillCatalogue();
  const tree = await skillRepository.findTree(treeSlug);
  if (!tree) return null;

  const [xpBySkill, history] = await Promise.all([
    skillRepository.xpBySkill(userId),
    skillRepository.listRecentTransactions(userId, 12, tree.id),
  ]);
  const nodes = buildSkillTree(tree.skills, xpBySkill);

  return {
    tree: { slug: tree.slug, name: tree.name, emoji: tree.emoji, description: tree.description, lifeArea: tree.lifeArea },
    nodes,
    summary: summarizeTree(nodes),
    history: history.map(toHistoryEntry),
  };
}

// ─── Quest integration ───────────────────────────────────────────────────────

export type SkillQuestEvent = {
  userId: string;
  questId: string;
  lifeArea: LifeArea;
  templateKey: string;
  title: string;
  goalTitle: string | null;
  /** The quest's XP, reused as skill XP. Already priced by the backend. */
  xpReward: number;
};

/**
 * Routes a completed quest into skill progress. Returns null when the quest
 * doesn't train a catalogued skill — not every action has to.
 */
export async function questCompleted(event: SkillQuestEvent): Promise<SkillAwardOutcome | null> {
  if (!isAwardableXp(event.xpReward)) return null;
  await ensureSkillCatalogue();

  const interests = await identityRepository.listInterests(event.userId);
  const match = matchQuestToSkill({
    lifeArea: event.lifeArea,
    templateKey: event.templateKey,
    title: event.title,
    goalTitle: event.goalTitle,
    interests: interests.map((interest) => interest.label),
  });
  if (!match) return null;

  const tree = await skillRepository.findTree(match.treeSlug);
  if (!tree) return null;

  const xpBySkill = await skillRepository.xpBySkill(event.userId);
  const nodes = buildSkillTree(tree.skills, xpBySkill);
  const target = resolveAwardTarget(nodes, match.skillSlug);
  if (!target) return null; // The whole tree is mastered.

  const awarded = await skillRepository.award({
    userId: event.userId,
    skillId: target.id,
    amount: event.xpReward,
    sourceType: "QUEST_COMPLETION",
    sourceId: event.questId,
    reason: event.title,
  });

  const xp = target.progress.xp + (awarded ? event.xpReward : 0);
  const progress = getSkillProgress(target.baseXp, target.maxLevel, xp);
  const unlocked = awarded ? unlockedBetween(nodes, target.id, target.progress.level, progress.level) : [];

  return {
    awarded,
    treeSlug: tree.slug,
    treeName: tree.name,
    skillSlug: target.slug,
    skillName: target.name,
    xpAwarded: awarded ? event.xpReward : 0,
    xp,
    level: progress.level,
    previousLevel: target.progress.level,
    leveledUp: awarded && progress.level > target.progress.level,
    mastered: progress.mastered,
    levelLabel: skillLevelLabel(progress.level, target.maxLevel),
    unlocked: unlocked.map((node) => ({ slug: node.slug, name: node.name })),
  };
}

/** Undoes whatever skill progress a quest completion produced. */
export async function questCompletionReverted(userId: string, questId: string): Promise<void> {
  await skillRepository.revoke(userId, "QUEST_COMPLETION", questId);
}
