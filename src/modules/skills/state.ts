import { getSkillProgress, skillLevelForXp, type SkillProgress } from "./levels";

/**
 * Derives what the user sees in a skill tree (spec §15–16):
 * mastered → what I know, in progress → what I'm learning,
 * available → what I can unlock next, locked → what's further ahead.
 *
 * Pure and client-safe: rows and XP in, plain serialisable nodes out.
 */

export type SkillStatus = "MASTERED" | "IN_PROGRESS" | "AVAILABLE" | "LOCKED";

/** The catalogue fields state derivation needs, as stored in the database. */
export type SkillStateRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  order: number;
  maxLevel: number;
  baseXp: number;
  requiresId: string | null;
  unlockLevel: number;
};

export type SkillRequirement = { slug: string; name: string; level: number };

export type SkillNode = SkillStateRow & {
  status: SkillStatus;
  progress: SkillProgress;
  /** What must be levelled before this skill opens; null when none or already met. */
  requirement: SkillRequirement | null;
  children: SkillNode[];
};

/** Builds the nested, status-annotated tree from skill rows and per-skill XP. */
export function buildSkillTree(rows: SkillStateRow[], xpBySkillId: ReadonlyMap<string, number>): SkillNode[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const levelOf = (row: SkillStateRow) => skillLevelForXp(row.baseXp, row.maxLevel, xpBySkillId.get(row.id) ?? 0);

  const toNode = (row: SkillStateRow): SkillNode => {
    const xp = xpBySkillId.get(row.id) ?? 0;
    const progress = getSkillProgress(row.baseXp, row.maxLevel, xp);
    const requires = row.requiresId ? byId.get(row.requiresId) : undefined;
    const met = !requires || levelOf(requires) >= row.unlockLevel;

    let status: SkillStatus;
    if (progress.mastered) status = "MASTERED";
    else if (xp > 0) status = "IN_PROGRESS";
    else if (met) status = "AVAILABLE";
    else status = "LOCKED";

    return {
      ...row,
      status,
      progress,
      requirement: requires && !met ? { slug: requires.slug, name: requires.name, level: row.unlockLevel } : null,
      children: [],
    };
  };

  const nodes = new Map(rows.map((row) => [row.id, toNode(row)]));
  const roots: SkillNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: SkillNode[]) => {
    list.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    list.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

/** Preorder walk — the tree's natural reading order. */
export function flattenTree(nodes: SkillNode[]): SkillNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

/**
 * Where progress in this tree currently lands: the skill being learned, or
 * the first one ready to start. Null once everything is mastered.
 */
export function frontierSkill(nodes: SkillNode[]): SkillNode | null {
  const flat = flattenTree(nodes);
  return flat.find((node) => node.status === "IN_PROGRESS") ?? flat.find((node) => node.status === "AVAILABLE") ?? null;
}

/**
 * Resolves which skill an award should actually land in. A preferred skill
 * that is still locked pays into its requirement chain instead (practising
 * sport before Athletics unlocks still builds Endurance); a mastered or
 * missing preference falls back to the tree's frontier.
 */
export function resolveAwardTarget(nodes: SkillNode[], preferredSlug?: string | null): SkillNode | null {
  const flat = flattenTree(nodes);
  const bySlug = new Map(flat.map((node) => [node.slug, node]));

  let candidate = preferredSlug ? (bySlug.get(preferredSlug) ?? null) : null;
  const seen = new Set<string>();
  while (candidate && candidate.status === "LOCKED" && !seen.has(candidate.id)) {
    seen.add(candidate.id);
    candidate = candidate.requiresId ? (flat.find((node) => node.id === candidate!.requiresId) ?? null) : null;
  }
  if (candidate && (candidate.status === "AVAILABLE" || candidate.status === "IN_PROGRESS")) return candidate;
  return frontierSkill(nodes);
}

export type SkillTreeSummary = {
  total: number;
  mastered: number;
  learning: number;
  available: number;
  locked: number;
  xp: number;
};

export function summarizeTree(nodes: SkillNode[]): SkillTreeSummary {
  const flat = flattenTree(nodes);
  return {
    total: flat.length,
    mastered: flat.filter((n) => n.status === "MASTERED").length,
    learning: flat.filter((n) => n.status === "IN_PROGRESS").length,
    available: flat.filter((n) => n.status === "AVAILABLE").length,
    locked: flat.filter((n) => n.status === "LOCKED").length,
    xp: flat.reduce((sum, n) => sum + n.progress.xp, 0),
  };
}

/**
 * Skills that would newly unlock if `target` moved from `fromLevel` to
 * `toLevel` — the "you opened something" moment (spec §16).
 */
export function unlockedBetween(nodes: SkillNode[], targetId: string, fromLevel: number, toLevel: number): SkillNode[] {
  if (toLevel <= fromLevel) return [];
  return flattenTree(nodes).filter(
    (node) => node.requiresId === targetId && node.unlockLevel > fromLevel && node.unlockLevel <= toLevel && node.progress.xp === 0,
  );
}
