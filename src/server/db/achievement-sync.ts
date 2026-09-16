import type { PrismaClient } from "@/generated/prisma/client";
import { ACHIEVEMENTS } from "@/modules/achievements/catalogue";

/**
 * Writes the achievement catalogue into the database (spec §17). Idempotent
 * upserts by slug, safe on every boot and from the seed; never deletes, so a
 * retired achievement keeps the unlocks pointing at it. Kept free of
 * `server-only` so CLI scripts (seed) can reuse it.
 */
export async function syncAchievementCatalogue(prisma: PrismaClient): Promise<void> {
  for (const spec of ACHIEVEMENTS) {
    const data = { name: spec.name, description: spec.description, xpReward: spec.xpReward };
    await prisma.achievement.upsert({
      where: { slug: spec.slug },
      update: data,
      create: { slug: spec.slug, ...data },
    });
  }
}
