import "server-only";

import type { z } from "zod";

import { getEnv } from "@/config/env";

import { AnthropicAIProvider } from "./providers/anthropic";
import { MockAIProvider } from "./providers/mock";
import {
  AIOutputValidationError,
  type AIProvider,
  type StructuredRequest,
} from "./types";

export { AIOutputValidationError, AIProviderError } from "./types";
export type { AIProvider, StructuredRequest } from "./types";

// One mock instance per process so tests can register handlers on the same
// object the app resolves.
const mock = new MockAIProvider();

// The Anthropic client is built once; the mock is consulted live so a test
// that arms it after the first call still takes effect.
let anthropic: { provider: AIProvider | undefined } | undefined;

/**
 * The configured provider, or `undefined` when AI isn't usable (e.g.
 * AI_PROVIDER=anthropic with no key, or the test mock isn't armed). Callers
 * must handle `undefined` and fall back — see `aiOrFallback`.
 */
export function getAIProvider(): AIProvider | undefined {
  const env = getEnv();

  if (env.AI_PROVIDER === "anthropic") {
    if (!anthropic) {
      if (env.ANTHROPIC_API_KEY) {
        anthropic = { provider: new AnthropicAIProvider(env.ANTHROPIC_API_KEY, env.AI_MODEL) };
      } else {
        console.warn(
          "[ai] AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set — the AI Mentor will use deterministic fallbacks.",
        );
        anthropic = { provider: undefined };
      }
    }
    return anthropic.provider;
  }

  // AI_PROVIDER=mock is a test seam: only "available" once a test arms it,
  // so dev falls back silently instead of logging on every call.
  return mock.isArmed ? mock : undefined;
}

/** True when the real (Claude-backed) mentor is configured and usable. */
export function isRealAIConfigured(): boolean {
  return getAIProvider()?.name === "anthropic";
}

/** The mock provider, for registering handlers in tests. */
export function getMockAIProvider(): MockAIProvider {
  return mock;
}

/** Test-only: drop the memoised resolution and disarm the mock. */
export function resetAIProviderForTests(): void {
  anthropic = undefined;
  mock.reset();
}

/**
 * Validate a provider's output against the request schema. Throws
 * AIOutputValidationError on mismatch so invalid AI output never reaches
 * game state.
 */
export async function generateStructured<TSchema extends z.ZodType>(
  provider: AIProvider,
  request: StructuredRequest<TSchema>,
): Promise<z.infer<TSchema>> {
  const raw = await provider.generate(request);
  const parsed = request.schema.safeParse(raw);
  if (!parsed.success) {
    throw new AIOutputValidationError(request.task, parsed.error.issues);
  }
  return parsed.data;
}
