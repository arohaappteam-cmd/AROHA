import "server-only";

import { z } from "zod";

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
});

export type Env = z.infer<typeof envSchema>;

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

  cached = parsed.data;
  return cached;
}
