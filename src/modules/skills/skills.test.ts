import { describe, expect, it } from "vitest";

import { findTreeSpec, flattenSpec, fullSkillSlug, requirementOf, SKILL_TREES } from "./catalogue";
import { getSkillProgress, skillLevelForXp, skillLevelLabel, SKILL_BASE_XP_RANGE, SKILL_MAX_LEVEL_RANGE, skillXpForLevel } from "./levels";
import { matchQuestToSkill } from "./matching";
import { buildSkillTree, flattenTree, frontierSkill, resolveAwardTarget, summarizeTree, unlockedBetween, type SkillStateRow } from "./state";

describe("skill levels", () => {
  it("prices each level progressively from the skill's own baseXp", () => {
    expect(skillXpForLevel(50, 0)).toBe(0);
    expect(skillXpForLevel(50, 1)).toBe(50);
    expect(skillXpForLevel(50, 2)).toBe(150);
    expect(skillXpForLevel(50, 3)).toBe(300);
    // Skills are not equal: a deeper skill costs more at every step.
    expect(skillXpForLevel(120, 3)).toBeGreaterThan(skillXpForLevel(40, 3));
  });

  it("derives the level from XP, capped at the skill's maxLevel", () => {
    expect(skillLevelForXp(50, 5, 0)).toBe(0);
    expect(skillLevelForXp(50, 5, 49)).toBe(0);
    expect(skillLevelForXp(50, 5, 50)).toBe(1);
    expect(skillLevelForXp(50, 5, 150)).toBe(2);
    expect(skillLevelForXp(50, 3, 1_000_000)).toBe(3);
  });

  it("reports progress toward the next level", () => {
    const progress = getSkillProgress(50, 5, 75);
    expect(progress.level).toBe(1);
    expect(progress.xpIntoLevel).toBe(25);
    expect(progress.xpForNextLevel).toBe(100);
    expect(progress.xpToNextLevel).toBe(75);
    expect(progress.percent).toBe(25);
    expect(progress.mastered).toBe(false);
  });

  it("marks mastery at maxLevel with a full bar", () => {
    const progress = getSkillProgress(30, 3, skillXpForLevel(30, 3));
    expect(progress.mastered).toBe(true);
    expect(progress.percent).toBe(100);
    expect(progress.xpToNextLevel).toBe(0);
  });

  it("labels levels across different depths", () => {
    expect(skillLevelLabel(0, 5)).toBe("Not started");
    expect(skillLevelLabel(1, 5)).toBe("Novice");
    expect(skillLevelLabel(5, 5)).toBe("Mastered");
    expect(skillLevelLabel(3, 3)).toBe("Mastered");
    expect(skillLevelLabel(1, 3)).toBe("Novice");
    expect(skillLevelLabel(1, 1)).toBe("Mastered");
  });
});

// ─── Catalogue integrity ─────────────────────────────────────────────────────

describe("skill catalogue", () => {
  it("covers the spec's example and requested areas", () => {
    for (const slug of [
      "programming", "fitness", "music", "photography", "writing",
      "languages", "business", "cooking", "art", "communication", "leadership",
    ]) {
      expect(findTreeSpec(slug), slug).toBeDefined();
    }
    const programming = flattenSpec(findTreeSpec("programming")!).map((entry) => entry.spec.slug);
    expect(programming).toEqual(
      expect.arrayContaining(["fundamentals", "python", "syntax", "oop", "advanced-python", "web-development", "backend", "databases", "ai-ml"]),
    );
  });

  it("has globally unique slugs and sane numbers", () => {
    const seen = new Set<string>();
    for (const tree of SKILL_TREES) {
      for (const { spec } of flattenSpec(tree)) {
        const slug = fullSkillSlug(tree.slug, spec.slug);
        expect(seen.has(slug), slug).toBe(false);
        seen.add(slug);
        const maxLevel = spec.maxLevel ?? 5;
        const baseXp = spec.baseXp ?? 50;
        expect(maxLevel).toBeGreaterThanOrEqual(SKILL_MAX_LEVEL_RANGE.min);
        expect(maxLevel).toBeLessThanOrEqual(SKILL_MAX_LEVEL_RANGE.max);
        expect(baseXp).toBeGreaterThanOrEqual(SKILL_BASE_XP_RANGE.min);
        expect(baseXp).toBeLessThanOrEqual(SKILL_BASE_XP_RANGE.max);
      }
    }
  });

  it("only requires skills that exist, at levels they can reach, without cycles", () => {
    for (const tree of SKILL_TREES) {
      const entries = flattenSpec(tree);
      const bySlug = new Map(entries.map((entry) => [entry.spec.slug, entry]));
      for (const entry of entries) {
        const requirement = requirementOf(entry.spec, entry.parentSlug);
        if (!requirement) continue;
        const target = bySlug.get(requirement.slug);
        expect(target, `${tree.slug}.${entry.spec.slug} requires ${requirement.slug}`).toBeDefined();
        expect(requirement.level).toBeLessThanOrEqual(target!.spec.maxLevel ?? 5);

        // Follow the chain to prove it terminates.
        const seen = new Set<string>();
        let cursor: typeof entry | undefined = entry;
        while (cursor) {
          expect(seen.has(cursor.spec.slug), `cycle at ${tree.slug}.${cursor.spec.slug}`).toBe(false);
          seen.add(cursor.spec.slug);
          const next = requirementOf(cursor.spec, cursor.parentSlug);
          cursor = next ? bySlug.get(next.slug) : undefined;
        }
      }
      // Every tree must have an entry point.
      expect(entries.some((entry) => !requirementOf(entry.spec, entry.parentSlug)), tree.slug).toBe(true);
    }
  });

  it("maps quest templates to skills that exist in the same tree", () => {
    for (const tree of SKILL_TREES) {
      const slugs = new Set(flattenSpec(tree).map((entry) => entry.spec.slug));
      for (const skill of Object.values(tree.templateSkills ?? {})) {
        expect(slugs.has(skill), `${tree.slug} → ${skill}`).toBe(true);
      }
    }
  });
});

// ─── Tree state ──────────────────────────────────────────────────────────────

function row(overrides: Partial<SkillStateRow> & Pick<SkillStateRow, "id" | "slug" | "name">): SkillStateRow {
  return { description: null, parentId: null, order: 0, maxLevel: 5, baseXp: 50, requiresId: null, unlockLevel: 1, ...overrides };
}

/** basics (open, max 3) → practice (needs basics@1) → advanced (needs practice@2); child under practice. */
const ROWS: SkillStateRow[] = [
  row({ id: "basics", slug: "t.basics", name: "Basics", maxLevel: 3, baseXp: 30, order: 0 }),
  row({ id: "practice", slug: "t.practice", name: "Practice", requiresId: "basics", order: 1 }),
  row({ id: "practice-child", slug: "t.practice-child", name: "Practice Child", parentId: "practice", requiresId: "practice", order: 0 }),
  row({ id: "advanced", slug: "t.advanced", name: "Advanced", requiresId: "practice", unlockLevel: 2, baseXp: 120, order: 2 }),
];

const xp = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe("skill tree state", () => {
  it("derives know → learning → next → locked", () => {
    const nodes = buildSkillTree(ROWS, xp({ basics: 200, practice: 60 }));
    const byId = new Map(flattenTree(nodes).map((node) => [node.id, node]));
    expect(byId.get("basics")!.status).toBe("MASTERED"); // 200 ≥ 30×6
    expect(byId.get("practice")!.status).toBe("IN_PROGRESS");
    expect(byId.get("practice-child")!.status).toBe("AVAILABLE"); // practice reached level 1
    expect(byId.get("advanced")!.status).toBe("LOCKED"); // needs practice at level 2
    expect(byId.get("advanced")!.requirement).toEqual({ slug: "t.practice", name: "Practice", level: 2 });
  });

  it("nests children under parents in order", () => {
    const nodes = buildSkillTree(ROWS, new Map());
    expect(nodes.map((node) => node.id)).toEqual(["basics", "practice", "advanced"]);
    expect(nodes[1].children.map((node) => node.id)).toEqual(["practice-child"]);
  });

  it("finds the frontier: current learning first, then first available", () => {
    expect(frontierSkill(buildSkillTree(ROWS, new Map()))!.id).toBe("basics");
    expect(frontierSkill(buildSkillTree(ROWS, xp({ basics: 40, practice: 60 })))!.id).toBe("basics");
    const allMastered = xp({ basics: 1000, practice: 5000, "practice-child": 5000, advanced: 10000 });
    expect(frontierSkill(buildSkillTree(ROWS, allMastered))).toBeNull();
  });

  it("routes awards for locked skills up the requirement chain", () => {
    const nodes = buildSkillTree(ROWS, xp({ basics: 30 }));
    // Advanced is locked (practice at 0 < 2) → pays into practice, which is available.
    expect(resolveAwardTarget(nodes, "t.advanced")!.id).toBe("practice");
    // A mastered preference falls back to the frontier.
    const later = buildSkillTree(ROWS, xp({ basics: 1000, practice: 20 }));
    expect(resolveAwardTarget(later, "t.basics")!.id).toBe("practice");
    // No preference → frontier.
    expect(resolveAwardTarget(nodes)!.id).toBe("basics");
  });

  it("summarises a tree", () => {
    const summary = summarizeTree(buildSkillTree(ROWS, xp({ basics: 200, practice: 60 })));
    expect(summary).toEqual({ total: 4, mastered: 1, learning: 1, available: 1, locked: 1, xp: 260 });
  });

  it("reports skills newly unlocked by a level change", () => {
    const nodes = buildSkillTree(ROWS, xp({ basics: 30, practice: 150 }));
    const unlocked = unlockedBetween(nodes, "practice", 1, 2);
    expect(unlocked.map((node) => node.id)).toEqual(["advanced"]);
    expect(unlockedBetween(nodes, "practice", 2, 2)).toEqual([]);
  });
});

// ─── Quest → skill matching ──────────────────────────────────────────────────

describe("quest → skill matching", () => {
  it("maps quest templates straight to a skill", () => {
    expect(matchQuestToSkill({ lifeArea: "PHYSICAL", templateKey: "physical.run", title: "Go for a run" })).toMatchObject({
      treeSlug: "fitness",
      skillSlug: "fitness.endurance",
    });
    expect(matchQuestToSkill({ lifeArea: "SOCIAL", templateKey: "social.call", title: "Call someone" })).toMatchObject({
      treeSlug: "communication",
      skillSlug: "communication.conversation",
    });
  });

  it("routes goal-driven quests into the goal's tree", () => {
    const match = matchQuestToSkill({
      lifeArea: "PERSONAL_GOAL",
      templateKey: "goal.mission",
      title: "Work on: set up Python",
      goalTitle: "Learn Python programming",
    });
    expect(match).toMatchObject({ treeSlug: "programming", skillSlug: null });
  });

  it("falls back to interests for learning quests, and to nothing when no signal exists", () => {
    const viaInterest = matchQuestToSkill({
      lifeArea: "LEARNING",
      templateKey: "learning.reading",
      title: "Read for 20 minutes",
      interests: ["Street photography"],
    });
    expect(viaInterest).toMatchObject({ treeSlug: "photography" });

    const nothing = matchQuestToSkill({
      lifeArea: "MENTAL",
      templateKey: "mental.meditation",
      title: "Meditate for 10 minutes",
    });
    expect(nothing).toBeNull();
  });

  it("keeps creative quests inside creative trees when matching interests", () => {
    const match = matchQuestToSkill({
      lifeArea: "CREATIVITY",
      templateKey: "bonus.create",
      title: "Make something small",
      interests: ["startup ideas", "playing guitar"],
    });
    expect(match).toMatchObject({ treeSlug: "music" });
  });

  it("gives physical quests a home tree even without goals or interests", () => {
    const match = matchQuestToSkill({ lifeArea: "PHYSICAL", templateKey: "custom.physical", title: "Move your body" });
    expect(match).toMatchObject({ treeSlug: "fitness", skillSlug: null });
  });
});
