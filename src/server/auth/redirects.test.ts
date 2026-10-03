import { describe, expect, it } from "vitest";

import { safeNext } from "./redirects";

describe("safeNext", () => {
  it("keeps same-site paths, with their query and hash", () => {
    expect(safeNext("/goals")).toBe("/goals");
    expect(safeNext("/community/people/priya-4k2q?tab=1#mentor")).toBe("/community/people/priya-4k2q?tab=1#mentor");
  });

  it("falls back to home for anything empty or not a path", () => {
    for (const value of [null, undefined, "", "goals", "https://evil.example", "javascript:alert(1)"]) expect(safeNext(value)).toBe("/");
  });

  it("never lets a path turn into another site", () => {
    // Browsers drop tabs and newlines, and read backslashes as slashes.
    for (const value of ["//evil.example", "/\evil.example", "/\t/evil.example", "/\n/evil.example", "/%09/evil.example", "\/evil.example"]) {
      const target = new URL(safeNext(value), "https://aroha.example");
      expect(target.origin, value).toBe("https://aroha.example");
    }
  });
});
