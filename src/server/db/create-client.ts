import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Gives `sslmode` in DATABASE_URL its usual (libpq) meaning for the runtime
 * driver, so one URL works for both the app and the Prisma CLI:
 *
 * - `require`: encrypt the connection. Certificates are verified only when
 *   DATABASE_CA_CERT holds the server's CA (Supabase: Database settings →
 *   SSL configuration → download certificate).
 * - `verify-full` / `verify-ca`: always verify, against DATABASE_CA_CERT or
 *   the system's trusted CAs.
 *
 * node-postgres on its own reads `require` as verify-full, which rejects
 * providers (like Supabase) that sign with their own CA.
 */
export function connectionOptions(connectionString: string) {
  const url = new URL(connectionString);
  const mode = url.searchParams.get("sslmode");
  if (!mode || mode === "disable") return { connectionString };

  url.searchParams.delete("sslmode");
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  const ssl = ca ? { ca } : mode === "verify-full" || mode === "verify-ca" ? true : { rejectUnauthorized: false };
  return { connectionString: url.toString(), ssl };
}

/**
 * Builds a Prisma client over the node-postgres driver adapter.
 * Kept free of `server-only` so CLI scripts (seed) can reuse it.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({
    ...connectionOptions(connectionString),
    connectionTimeoutMillis: 5_000,
  });
  return new PrismaClient({ adapter });
}
