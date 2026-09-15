import { describe, expect, it } from "vitest";

import { normalizeAttributeTotals } from "./attribute-totals";

describe("normalizeAttributeTotals", () => {
  it("fills missing attributes with zero in display order", () => {
    const result = normalizeAttributeTotals([
      { attribute: "DISCIPLINE", total: 12 },
      { attribute: "STRENGTH", total: 4 },
    ]);

    expect(result.map((r) => r.attribute)).toEqual([
      "INTELLECT",
      "STRENGTH",
      "SOCIAL",
      "CREATIVITY",
      "DISCIPLINE",
      "SKILLS",
    ]);
    expect(result.find((r) => r.attribute === "DISCIPLINE")?.total).toBe(12);
    expect(result.find((r) => r.attribute === "SOCIAL")?.total).toBe(0);
  });
});
