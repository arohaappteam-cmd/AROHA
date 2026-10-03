import "server-only";

import { attachDatabasePool } from "@vercel/functions";

import { getEnv } from "@/config/env";
import type { PrismaClient } from "@/generated/prisma/client";

import { createPool, createPrismaClient } from "./create-client";

// Reuse one client across hot reloads in development to avoid exhausting
// the connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createAppClient(): PrismaClient {
  const env = getEnv();
  const pool = createPool(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX });
  // On Vercel's Fluid compute, keeps the instance alive just long enough to
  // close idle connections before it's suspended, so they don't pile up on
  // the pooler. A no-op everywhere else.
  if (process.env.VERCEL) attachDatabasePool(pool);
  return createPrismaClient(env.DATABASE_URL, pool);
}

export const db: PrismaClient = globalForPrisma.prisma ?? createAppClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
