import "dotenv/config";

import { LOCAL_USER_DEFAULT_NAME, LOCAL_USER_HANDLE } from "../src/config/site";
import { syncAchievementCatalogue } from "../src/server/db/achievement-sync";
import { createPrismaClient } from "../src/server/db/create-client";
import { syncSkillCatalogue } from "../src/server/db/skill-sync";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const prisma = createPrismaClient(databaseUrl);

// Mirrors src/config/env.ts: real accounts when Supabase is configured.
const usesAccounts =
  (process.env.AUTH_MODE ?? (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "supabase" : "local")) ===
  "supabase";

async function main() {
  if (usesAccounts) {
    console.log("Supabase Auth is on: users are created when they sign up, so no local user is seeded.");
  } else {
    // Idempotent: the app also creates this user lazily on first request.
    const user = await prisma.user.upsert({
      where: { handle: LOCAL_USER_HANDLE },
      update: {},
      create: { handle: LOCAL_USER_HANDLE, displayName: LOCAL_USER_DEFAULT_NAME },
    });
    console.log(`Local user ready: ${user.displayName} (${user.id})`);
  }

  // Idempotent: the app also syncs the catalogue lazily on first use.
  await syncSkillCatalogue(prisma);
  const [trees, skills] = await Promise.all([prisma.skillTree.count(), prisma.skill.count()]);
  console.log(`Skill catalogue ready: ${trees} trees, ${skills} skills`);

  await syncAchievementCatalogue(prisma);
  console.log(`Achievement catalogue ready: ${await prisma.achievement.count()} achievements`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
