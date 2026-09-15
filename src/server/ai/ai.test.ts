import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/config/env", () => ({
  getEnv: () => ({ NODE_ENV: "test", DATABASE_URL: "postgresql://x", AI_PROVIDER: "mock", AI_MODEL: "claude-opus-5" }),
}));

import {
  AIOutputValidationError,
  generateStructured,
  getAIProvider,
  getMockAIProvider,
  isRealAIConfigured,
  resetAIProviderForTests,
} from "./index";
import { aiOrFallback } from "./run";

const schema = z.object({ title: z.string(), minutes: z.number().int().positive() });
const request = { task: "test.task", schema, prompt: "make one" };

beforeEach(() => {
  resetAIProviderForTests();
});

describe("generateStructured", () => {
  it("returns provider output that matches the schema", async () => {
    getMockAIProvider().register("test.task", () => ({ title: "Walk", minutes: 20 }));
    const provider = getAIProvider()!;
    await expect(generateStructured(provider, request)).resolves.toEqual({ title: "Walk", minutes: 20 });
  });

  it("rejects output that does not match the schema", async () => {
    getMockAIProvider().register("test.task", () => ({ title: "Walk", minutes: -5 }));
    const provider = getAIProvider()!;
    await expect(generateStructured(provider, request)).rejects.toBeInstanceOf(AIOutputValidationError);
  });

  it("passes the request through to the provider", async () => {
    const seen: unknown[] = [];
    getMockAIProvider().register("test.task", (req) => {
      seen.push(req.prompt);
      return { title: "Read", minutes: 15 };
    });
    await generateStructured(getAIProvider()!, request);
    expect(seen).toEqual(["make one"]);
  });
});

describe("aiOrFallback", () => {
  it("uses AI output when the provider answers with valid data", async () => {
    getMockAIProvider().register("test.task", () => ({ title: "Meditate", minutes: 10 }));
    const result = await aiOrFallback(request, () => ({ title: "fallback", minutes: 1 }));
    expect(result).toEqual({ source: "ai", value: { title: "Meditate", minutes: 10 } });
  });

  it("falls back when the provider has no handler for the task", async () => {
    const result = await aiOrFallback(request, () => ({ title: "fallback", minutes: 1 }));
    expect(result).toEqual({ source: "fallback", value: { title: "fallback", minutes: 1 } });
  });

  it("falls back when the provider returns schema-invalid output", async () => {
    getMockAIProvider().register("test.task", () => ({ title: 123, minutes: "nope" }));
    const result = await aiOrFallback(request, () => ({ title: "safe", minutes: 5 }));
    expect(result.source).toBe("fallback");
    expect(result.value.title).toBe("safe");
  });

  it("supports async fallbacks", async () => {
    const result = await aiOrFallback(request, async () => ({ title: "later", minutes: 2 }));
    expect(result).toEqual({ source: "fallback", value: { title: "later", minutes: 2 } });
  });
});

describe("provider selection", () => {
  it("is unavailable until the mock is armed, and never counts as real AI", () => {
    expect(getAIProvider()).toBeUndefined();
    expect(isRealAIConfigured()).toBe(false);

    getMockAIProvider().register("test.task", () => ({ title: "x", minutes: 1 }));
    expect(getAIProvider()?.name).toBe("mock");
    expect(isRealAIConfigured()).toBe(false);
  });
});
