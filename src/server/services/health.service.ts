import "server-only";

import { db } from "@/server/db";

/**
 * What `/api/health` tells the world: whether the app can reach its database,
 * and nothing else. The endpoint is public (Render's health check calls it),
 * so failure details go to the server log, never into the response.
 */
export type HealthReport = {
  status: "ok" | "degraded";
  database: { ok: boolean; latencyMs?: number };
};

export async function checkHealth(): Promise<HealthReport> {
  const database = await checkDatabase();
  return { status: database.ok ? "ok" : "degraded", database };
}

async function checkDatabase(): Promise<HealthReport["database"]> {
  const started = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    console.error("[health] database check failed", error);
    return { ok: false };
  }
}
