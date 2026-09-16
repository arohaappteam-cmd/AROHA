import type { PrismaClient } from "@/generated/prisma/client";
import { flattenSpec, fullSkillSlug, requirementOf, SKILL_TREES } from "@/modules/skills/catalogue";

/**
 * Writes the built-in skill catalogue into the database (spec §15).
 *
 * Idempotent upserts by slug: safe to run on every boot and from the seed.
 * Never deletes — retired catalogue entries keep any user progress they hold.
 * Kept free of `server-only` so CLI scripts (seed) can reuse it.
 */
export async function syncSkillCatalogue(prisma: PrismaClient): Promise<void> {
  for (const [treeIndex, spec] of SKILL_TREES.entries()) {
    const treeData = {
      name: spec.name,
      description: spec.description,
      emoji: spec.emoji,
      lifeArea: spec.lifeArea,
      sortOrder: treeIndex,
      source: "TEMPLATE" as const,
    };
    const tree = await prisma.skillTree.upsert({
      where: { slug: spec.slug },
      update: treeData,
      create: { slug: spec.slug, ...treeData },
    });

    // Pass 1: the skills themselves. Sibling order follows the spec's order.
    const entries = flattenSpec(spec);
    const siblingIndex = new Map<string | null, number>();
    const idBySlug = new Map<string, string>();
    for (const { spec: skill, parentSlug } of entries) {
      const order = siblingIndex.get(parentSlug) ?? 0;
      siblingIndex.set(parentSlug, order + 1);

      const slug = fullSkillSlug(spec.slug, skill.slug);
      const data = {
        treeId: tree.id,
        name: skill.name,
        description: skill.description,
        lifeArea: spec.lifeArea,
        order,
        maxLevel: skill.maxLevel ?? 5,
        baseXp: skill.baseXp ?? 50,
        source: "TEMPLATE" as const,
      };
      const row = await prisma.skill.upsert({
        where: { slug },
        update: data,
        create: { slug, ...data },
      });
      idBySlug.set(skill.slug, row.id);
    }

    // Pass 2: structure and unlock gates, once every id is known.
    for (const { spec: skill, parentSlug } of entries) {
      const requirement = requirementOf(skill, parentSlug);
      await prisma.skill.update({
        where: { slug: fullSkillSlug(spec.slug, skill.slug) },
        data: {
          parentId: parentSlug ? (idBySlug.get(parentSlug) ?? null) : null,
          requiresId: requirement ? (idBySlug.get(requirement.slug) ?? null) : null,
          unlockLevel: requirement?.level ?? 1,
        },
      });
    }
  }
}
