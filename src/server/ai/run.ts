import "server-only";

import type { z } from "zod";

import { generateStructured, getAIProvider } from "./index";
import type { StructuredRequest } from "./types";

export type AISource = "ai" | "fallback";
export type AIResult<T> = { value: T; source: AISource };

/**
 * Run an AI task, falling back to a deterministic result if AI is
 * unavailable or fails. This is the single seam every mentor feature uses:
 * the app behaves identically (just less personalised) with no API key, a
 * network error, a refusal, or schema-invalid output.
 *
 * `source` lets callers show whether a result came from the model or the
 * built-in fallback. `allowed: false` (the user's plan doesn't include AI)
 * goes straight to the fallback.
 */
export async function aiOrFallback<TSchema extends z.ZodType>(
  request: StructuredRequest<TSchema>,
  fallback: () => Promise<z.infer<TSchema>> | z.infer<TSchema>,
  { allowed = true }: { allowed?: boolean } = {},
): Promise<AIResult<z.infer<TSchema>>> {
  const provider = allowed ? getAIProvider() : undefined;
  if (provider) {
    try {
      const value = await generateStructured(provider, request);
      return { value, source: "ai" };
    } catch (error) {
      // Expected in dev (no key / mock has no handler); log once, quietly.
      console.warn(`[ai] falling back for "${request.task}":`, error instanceof Error ? error.message : error);
    }
  }
  return { value: await fallback(), source: "fallback" };
}
