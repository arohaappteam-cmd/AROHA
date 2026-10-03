import { getSkillProgress, skillLevelForXp, type SkillProgress } from "./levels";

/**
 * Derives what the user sees in a skill tree (spec §15–16):
 * mastered → what I know, in progress → what I'm learning,
 * available → what I can unlock next, locked → what's further ahead.
 *
 * Mastery is never just XP (spec §20): a skill at its top level only counts
 * as MASTERED once ability has been demonstrated in an assessed practical
 * task or project. Until then it stays IN_PROGRESS with `awaitingProof`.
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
  /** Top XP level reached, but mastery not yet demonstrated. */
  awaitingProof: boolean;
  progress: SkillProgress;
  /** What must be levelled before this skill opens; null when none or already met. */
  requirement: SkillRequirement | null;
  children: SkillNode[];
};

/**
 * Builds the nested, status-annotated tree from skill rows and per-skill XP.
 * `abilityVerified` holds ids of skills with a passed practical or project
 * assessment — the only way a skill becomes MASTERED.
 */
export function buildSkillTree(
  rows: SkillStateRow[],
  xpBySkillId: ReadonlyMap<string, number>,
  abilityVerified: ReadonlySet<string> = new Set(),
): SkillNode[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const levelOf = (row: SkillStateRow) => skillLevelForXp(row.baseXp, row.maxLevel, xpBySkillId.get(row.id) ?? 0);

  const toNode = (row: SkillStateRow): SkillNode => {
    const xp = xpBySkillId.get(row.id) ?? 0;
    const progress = getSkillProgress(row.baseXp, row.maxLevel, xp);
    const requires = row.requiresId ? byId.get(row.requiresId) : undefined;
    const met = !requires || levelOf(requires) >= row.unlockLevel;

    const awaitingProof = progress.mastered && !abilityVerified.has(row.id);
    let status: SkillStatus;
    if (progress.mastered && !awaitingProof) status = "MASTERED";
    else if (xp > 0) status = "IN_PROGRESS";
    else if (met) status = "AVAILABLE";
    else status = "LOCKED";

    return {
      ...row,
      status,
      awaitingProof,
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

/** A skill that practice XP can still move: open, and below its top level. */
function canGrow(node: SkillNode): boolean {
  return node.status === "AVAILABLE" || (node.status === "IN_PROGRESS" && !node.awaitingProof);
}

/**
 * Where progress in this tree currently lands: the skill being learned, or
 * the first one ready to start. Null once nothing can grow through practice.
 */
export function frontierSkill(nodes: SkillNode[]): SkillNode | null {
  const flat = flattenTree(nodes);
  return (
    flat.find((node) => node.status === "IN_PROGRESS" && !node.awaitingProof) ??
    flat.find((node) => node.status === "AVAILABLE") ??
    null
  );
}

export type SkillPathState = "mastered" | "complete" | "current" | "started" | "next" | "locked";

export type SkillPathStep = { slug: string; name: string; level: number; maxLevel: number; state: SkillPathState };

/**
 * A tree's journey in one line, in tree order: the skills already started
 * (the most recent few), where practice lands now, and the nearest skill
 * still locked. `complete` is the top level reached but not yet proven.
 */
export function skillPath(nodes: SkillNode[], maxStarted = 4): SkillPathStep[] {
  const flat = flattenTree(nodes);
  const frontier = frontierSkill(nodes);
  const step = (node: SkillNode, state: SkillPathState): SkillPathStep => ({
    slug: node.slug,
    name: node.name,
    level: node.progress.level,
    maxLevel: node.maxLevel,
    state,
  });

  const started = flat.filter((node) => node.progress.level >= 1 || node.status === "MASTERED");
  const steps = started.slice(-maxStarted).map((node) =>
    step(
      node,
      node.status === "MASTERED" ? "mastered" : node.slug === frontier?.slug ? "current" : node.progress.level >= node.maxLevel ? "complete" : "started",
    ),
  );
  if (frontier && !started.includes(frontier)) steps.push(step(frontier, "next"));
  const locked = flat.find((node) => node.status === "LOCKED");
  if (locked) steps.push(step(locked, "locked"));
  return steps;
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
  if (candidate && canGrow(candidate)) return candidate;
  return frontierSkill(nodes);
}

export type SkillTreeSummary = {
  total: number;
  mastered: number;
  learning: number;
  available: number;
  locked: number;
  /** At top level, waiting for a demonstration to confirm mastery. */
  awaitingProof: number;
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
    awaitingProof: flat.filter((n) => n.awaitingProof).length,
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
