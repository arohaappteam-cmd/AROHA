import "server-only";

import { getEnv } from "@/config/env";
import { getAIProvider } from "@/server/ai";
import { db } from "@/server/db";

export type HealthReport = {
  status: "ok" | "degraded";
  database: { ok: boolean; latencyMs?: number; error?: string };
  /** Which AI provider is active, or "fallback" when none is usable. */
  ai: { provider: string };
  environment: string;
};

export async function checkHealth(): Promise<HealthReport> {
  const env = getEnv();
  const database = await checkDatabase();

  return {
    status: database.ok ? "ok" : "degraded",
    database,
    ai: { provider: getAIProvider()?.name ?? "fallback" },
    environment: env.NODE_ENV,
  };
}

async function checkDatabase(): Promise<HealthReport["database"]> {
  const started = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
