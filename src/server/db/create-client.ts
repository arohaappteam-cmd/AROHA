import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Builds a Prisma client over the node-postgres driver adapter.
 * Kept free of `server-only` so CLI scripts (seed) can reuse it.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5_000,
  });
  return new PrismaClient({ adapter });
}
