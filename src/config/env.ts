import "server-only";

import { z } from "zod";

/** Unset and blank both mean "not configured". */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

/**
 * Server-side environment, validated once on first access.
 * Never import this from a Client Component.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required (see .env.example)" })
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      error: "DATABASE_URL must be a postgresql:// connection string",
    }),
  // Connections each server process may hold. Small on purpose: on Vercel
  // every function instance has its own pool, all sharing the pooler.
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  // "mock" is the offline default (used in dev and tests). "anthropic" turns
  // on the real AI Mentor when ANTHROPIC_API_KEY is also set; without a key it
  // degrades gracefully to deterministic fallbacks (see src/server/ai).
  AI_PROVIDER: z.enum(["mock", "anthropic"]).default("mock"),
  ANTHROPIC_API_KEY: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  AI_MODEL: z.string().trim().min(1).default("claude-opus-5"),
  // Supabase Auth. Both are public values (they also reach the browser).
  NEXT_PUBLIC_SUPABASE_URL: optionalString.pipe(z.url().optional()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
  // "supabase": real accounts. "local": one shared local user, no sign-in —
  // only for development, or a private deployment behind its own password.
  // Defaults to "supabase" when the keys are set, otherwise "local".
  AUTH_MODE: z.enum(["supabase", "local"]).optional(),
  // "Continue with Google" on the sign-in page. Turn the Google provider on
  // in Supabase first (docs/DEPLOYMENT.md), or set "off" to hide the button.
  AUTH_GOOGLE: z.enum(["on", "off"]).default("on"),
  // Server-only Supabase secret key (sb_secret_… or the legacy service_role
  // key). Used for one thing: removing a sign-in when someone deletes their
  // account. Never prefix it with NEXT_PUBLIC_ — that would ship it to browsers.
  SUPABASE_SECRET_KEY: optionalString,
});

export type Env = z.infer<typeof envSchema> & { AUTH_MODE: "supabase" | "local" };

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const data = parsed.data;
  const hasSupabase = Boolean(data.NEXT_PUBLIC_SUPABASE_URL && data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const authMode = data.AUTH_MODE ?? (hasSupabase ? "supabase" : "local");

  if (authMode === "supabase" && !hasSupabase) {
    throw new Error(
      "Invalid environment configuration:\n  - AUTH_MODE=supabase needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  // Without accounts every visitor is the same user. Refuse to do that in
  // production unless it was asked for in so many words.
  if (data.NODE_ENV === "production" && authMode === "local" && data.AUTH_MODE !== "local") {
    throw new Error(
      "Invalid environment configuration:\n  - Production needs Supabase Auth (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).\n    Set AUTH_MODE=local only for a private, single-user deployment.",
    );
  }

  if (data.SUPABASE_SECRET_KEY && data.SUPABASE_SECRET_KEY === data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Invalid environment configuration:\n  - SUPABASE_SECRET_KEY is set to the publishable key; use the project's secret key");
  }

  cached = { ...data, AUTH_MODE: authMode };
  return cached;
}
