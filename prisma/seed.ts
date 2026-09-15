import "dotenv/config";

import { LOCAL_USER_DEFAULT_NAME, LOCAL_USER_HANDLE } from "../src/config/site";
import { createPrismaClient } from "../src/server/db/create-client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const prisma = createPrismaClient(databaseUrl);

async function main() {
  // Idempotent: the app also creates this user lazily on first request.
  const user = await prisma.user.upsert({
    where: { handle: LOCAL_USER_HANDLE },
    update: {},
    create: { handle: LOCAL_USER_HANDLE, displayName: LOCAL_USER_DEFAULT_NAME },
  });
  console.log(`Local user ready: ${user.displayName} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
