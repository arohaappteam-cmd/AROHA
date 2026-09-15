import "dotenv/config";

import { attributeAwards, isAwardableXp } from "../src/modules/progression/awards";
import { createPrismaClient } from "../src/server/db/create-client";

/**
 * Awards XP for quest completions recorded before the progression engine
 * existed. Safe to re-run: the ledger's unique (sourceType, sourceId) means
 * an already-awarded completion is skipped, never doubled.
 *
 *   npm run db:backfill-xp
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const prisma = createPrismaClient(databaseUrl);

async function main() {
  const completions = await prisma.questCompletion.findMany({
    orderBy: { completedAt: "asc" },
    select: {
      questId: true,
      userId: true,
      xpReward: true,
      quest: { select: { title: true, lifeArea: true } },
    },
  });

  const awarded = await prisma.xpTransaction.findMany({
    where: { sourceType: "QUEST_COMPLETION" },
    select: { sourceId: true },
  });
  const already = new Set(awarded.map((row) => row.sourceId));

  let created = 0;
  let skipped = 0;

  for (const completion of completions) {
    if (already.has(completion.questId)) {
      skipped++;
      continue;
    }
    if (!isAwardableXp(completion.xpReward)) {
      console.warn(`Skipping ${completion.questId}: XP ${completion.xpReward} is not awardable`);
      skipped++;
      continue;
    }

    const awards = attributeAwards(completion.quest.lifeArea, completion.xpReward);
    await prisma.$transaction(async (tx) => {
      const xpTransaction = await tx.xpTransaction.create({
        data: {
          userId: completion.userId,
          amount: completion.xpReward,
          sourceType: "QUEST_COMPLETION",
          sourceId: completion.questId,
          lifeArea: completion.quest.lifeArea,
          reason: completion.quest.title,
        },
      });
      if (awards.length > 0) {
        await tx.statTransaction.createMany({
          data: awards.map((award) => ({
            userId: completion.userId,
            xpTransactionId: xpTransaction.id,
            attribute: award.attribute,
            amount: award.amount,
          })),
        });
      }
    });
    created++;
  }

  console.log(`Backfill complete: ${created} awarded, ${skipped} already counted or skipped.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
