import type { LifeArea } from "@/generated/prisma/enums";
import { baseTemplateKey } from "@/modules/quests/templates";

import { fullSkillSlug, SKILL_TREES, type SkillTreeSpec } from "./catalogue";

/**
 * Deterministic quest → skill routing (spec §15). Decides which skill tree —
 * and, when known, which exact skill — a completed quest trained.
 *
 * Same shape a future AI tagger will produce: it only *suggests* a target;
 * the skill service still resolves locks and picks the real award skill, so
 * generated suggestions can never unlock anything by themselves.
 */

export type QuestSkillContext = {
  lifeArea: LifeArea;
  /** The quest's recorded template key (may carry a variant suffix). */
  templateKey: string;
  title: string;
  /** Title of the goal the quest advances, when it has one. */
  goalTitle?: string | null;
  /** The user's interest labels, for quests with no more specific signal. */
  interests?: readonly string[];
};

export type SkillMatch = {
  treeSlug: string;
  /** Stored (full) slug of the specific skill, when the quest names one. */
  skillSlug: string | null;
  /** Why the match was made — recorded in the skill history. */
  reason: string;
};

/** Life areas whose quests may route via interests when nothing else matches. */
const INTEREST_DRIVEN: readonly LifeArea[] = ["LEARNING", "CREATIVITY", "EXPERIENCES", "PERSONAL_GOAL"];

/** Fallback tree per life area, for quests with no goal or interest signal. */
const LIFE_AREA_TREES: Partial<Record<LifeArea, string>> = {
  PHYSICAL: "fitness",
  SOCIAL: "communication",
};

function treeMatching(text: string, filter?: (tree: SkillTreeSpec) => boolean): SkillTreeSpec | undefined {
  return SKILL_TREES.find((tree) => (!filter || filter(tree)) && tree.match.test(text));
}

export function matchQuestToSkill(ctx: QuestSkillContext): SkillMatch | null {
  // 1. Quest templates that train a known skill directly (e.g. a run → Endurance).
  const base = baseTemplateKey(ctx.templateKey);
  for (const tree of SKILL_TREES) {
    const skillSlug = tree.templateSkills?.[base];
    if (skillSlug) {
      return { treeSlug: tree.slug, skillSlug: fullSkillSlug(tree.slug, skillSlug), reason: "quest type" };
    }
  }

  // 2. Experiment quests train the tree their experiment was set up for.
  if (base.startsWith("experiment.")) {
    const treeSlug = base.slice("experiment.".length);
    if (SKILL_TREES.some((tree) => tree.slug === treeSlug)) return { treeSlug, skillSlug: null, reason: "experiment" };
    return null;
  }

  // 3. Quests advancing a goal train the tree the goal is about.
  if (ctx.goalTitle) {
    const tree = treeMatching(ctx.goalTitle);
    if (tree) return { treeSlug: tree.slug, skillSlug: null, reason: `goal “${ctx.goalTitle}”` };
  }

  // 4. The quest's own wording (e.g. an AI lesson titled around a topic).
  const tree = treeMatching(ctx.title);
  if (tree) return { treeSlug: tree.slug, skillSlug: null, reason: "quest topic" };

  // 5. Learning and creative quests fall back to a matching interest;
  //    creative quests only into creative trees, so “piano” doesn't absorb a reading quest.
  if (INTEREST_DRIVEN.includes(ctx.lifeArea)) {
    for (const interest of ctx.interests ?? []) {
      const matched = treeMatching(interest, (t) => ctx.lifeArea !== "CREATIVITY" || t.lifeArea === "CREATIVITY");
      if (matched) return { treeSlug: matched.slug, skillSlug: null, reason: `your interest in ${interest.toLowerCase()}` };
    }
  }

  // 6. Areas with a natural home tree.
  const fallback = LIFE_AREA_TREES[ctx.lifeArea];
  if (fallback) return { treeSlug: fallback, skillSlug: null, reason: "life area" };

  // Not every quest trains a catalogued skill — and that's honest.
  return null;
}
