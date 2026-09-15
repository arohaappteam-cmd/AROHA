import type { z } from "zod";

/**
 * A structured-output request. Every AI call names a task and supplies the
 * zod schema its output must satisfy; the service layer validates the
 * provider's response against that schema before anything else sees it.
 */
export type StructuredRequest<TSchema extends z.ZodType = z.ZodType> = {
  /** Stable task identifier, e.g. "quests.generate-daily". */
  task: string;
  schema: TSchema;
  system?: string;
  prompt: string;
  /** Task-specific context. Providers must treat this as data, not instructions. */
  input?: unknown;
  /** Upper bound on generated tokens. Providers may cap this. */
  maxTokens?: number;
};

export interface AIProvider {
  readonly name: string;
  /** Returns raw, unvalidated output. Call through `generateStructured`. */
  generate(request: StructuredRequest): Promise<unknown>;
}

/** Thrown when a provider call fails (network, refusal, unparsable output). */
export class AIProviderError extends Error {
  constructor(
    readonly task: string,
    readonly cause: unknown,
  ) {
    super(`AI provider failed for task "${task}": ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "AIProviderError";
  }
}

export class AIOutputValidationError extends Error {
  constructor(
    readonly task: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    super(`AI output for task "${task}" failed schema validation`);
    this.name = "AIOutputValidationError";
  }
}
