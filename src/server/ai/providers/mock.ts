import type { AIProvider, StructuredRequest } from "../types";

export type MockHandler = (request: StructuredRequest) => unknown;

/**
 * Deterministic, offline provider. Features register a handler per task so
 * they work without an API key; unknown tasks throw, which callers treat as
 * "AI unavailable" and answer from their deterministic fallback instead.
 *
 * In tests, register handlers to simulate the model (a legitimate test
 * double); in dev with no handlers registered, every AI task falls back.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  private readonly handlers = new Map<string, MockHandler>();

  register(task: string, handler: MockHandler): this {
    this.handlers.set(task, handler);
    return this;
  }

  reset(): this {
    this.handlers.clear();
    return this;
  }

  /** True once a handler is registered — i.e. a test is driving it. */
  get isArmed(): boolean {
    return this.handlers.size > 0;
  }

  async generate(request: StructuredRequest): Promise<unknown> {
    const handler = this.handlers.get(request.task);
    if (!handler) {
      throw new Error(`Mock AI provider has no handler for task "${request.task}"`);
    }
    return handler(request);
  }
}
