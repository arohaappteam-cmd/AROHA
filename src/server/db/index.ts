import "server-only";

import { getEnv } from "@/config/env";
import type { PrismaClient } from "@/generated/prisma/client";

import { createPrismaClient } from "./create-client";

// Reuse one client across hot reloads in development to avoid exhausting
// the connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient(getEnv().DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
