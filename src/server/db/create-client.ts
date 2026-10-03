import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

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

export type PoolSettings = {
  /** Most connections this process holds open at once. */
  max?: number;
  /** Close a connection after it has sat unused this long. */
  idleTimeoutMillis?: number;
};

/**
 * A node-postgres pool sized for serverless. On Vercel, many function
 * instances each hold their own pool, so `max` stays small and idle
 * connections close quickly; Supabase's transaction pooler (port 6543)
 * multiplexes them onto a few real Postgres connections. Statements are
 * left unnamed (no `statementNameGenerator`), which a transaction pooler
 * requires.
 */
export function createPool(connectionString: string, settings: PoolSettings = {}): pg.Pool {
  return new pg.Pool({
    ...connectionOptions(connectionString),
    max: settings.max ?? 10,
    idleTimeoutMillis: settings.idleTimeoutMillis ?? 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

/**
 * Builds a Prisma client over the node-postgres driver adapter.
 * Kept free of `server-only` so CLI scripts (seed) can reuse it.
 */
export function createPrismaClient(connectionString: string, pool: pg.Pool = createPool(connectionString)): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
