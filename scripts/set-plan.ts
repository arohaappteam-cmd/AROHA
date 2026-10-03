import "dotenv/config";

import { parsePlanTier, PLAN_TIERS } from "../src/modules/plans/catalogue";
import { createPrismaClient } from "../src/server/db/create-client";

/**
 * Grants a plan by hand, while payments aren't live — e.g. to give friends
 * Pro during the beta. Finds the account by sign-in email or community
 * handle. With no tier, lists who asked to be notified about paid plans.
 *
 *   npm run plan:set -- friend@example.com pro
 *   npm run plan:set -- priya-sharma-4k2q premium
 *   npm run plan:set -- friend@example.com free
 *   npm run plan:set -- --interest
 *
 * Point DATABASE_URL (or DIRECT_URL) at production to change real accounts.
 */
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const prisma = createPrismaClient(databaseUrl);

async function listInterest() {
  const rows = await prisma.planInterest.findMany({
    orderBy: { createdAt: "asc" },
    select: { tier: true, createdAt: true, user: { select: { email: true, handle: true, plan: true } } },
  });
  if (rows.length === 0) return console.log("Nobody has asked to be notified yet.");
  for (const row of rows) {
    console.log(`${row.tier.padEnd(8)} ${row.createdAt.toISOString().slice(0, 10)}  ${row.user.email ?? row.user.handle} (on ${row.user.plan})`);
  }
}

async function main() {
  const [who, tierArg] = process.argv.slice(2);
  if (who === "--interest") return listInterest();
  if (!who || !tierArg) {
    console.error(`Usage: npm run plan:set -- <email|handle> <${PLAN_TIERS.join("|").toLowerCase()}>`);
    process.exitCode = 1;
    return;
  }
  const tier = parsePlanTier(tierArg);
  if (!tier) {
    console.error(`Unknown plan "${tierArg}". Use one of: ${PLAN_TIERS.join(", ").toLowerCase()}.`);
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findFirst({
    where: who.includes("@") ? { email: { equals: who.trim(), mode: "insensitive" } } : { handle: who.trim() },
    select: { id: true, displayName: true, email: true, handle: true, plan: true },
  });
  if (!user) {
    console.error(`No account found for "${who}". They need to sign in once first.`);
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { plan: tier, planUpdatedAt: new Date() } });
  console.log(`${user.displayName} (${user.email ?? user.handle}): ${user.plan} → ${tier}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
