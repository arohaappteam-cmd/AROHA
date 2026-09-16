import { describe, expect, it } from "vitest";

import type { QuestStatus } from "@/generated/prisma/enums";

import { computeShadowDebt, type ShadowDay } from "./debt";

const TODAY = "2026-09-16";
const day = (date: string, ...core: QuestStatus[]): ShadowDay => ({ date, core });

describe("shadow debt", () => {
  it("is clear when everything was finished or acknowledged", () => {
    const debt = computeShadowDebt(
      [
        day("2026-09-15", "COMPLETED", "COMPLETED", "SKIPPED", "DEFERRED", "COMPLETED"),
        day("2026-09-14", "COMPLETED", "SKIPPED", "COMPLETED", "COMPLETED", "COMPLETED"),
      ],
      TODAY,
    );
    expect(debt).toMatchObject({ level: "CLEAR", score: 0, unresolved: 0, guidance: [] });
  });

  it("counts only quests that expired in silence — skips and deferrals are decisions", () => {
    const debt = computeShadowDebt([day("2026-09-15", "EXPIRED", "SKIPPED", "DEFERRED", "COMPLETED", "COMPLETED")], TODAY);
    expect(debt).toMatchObject({ level: "LIGHT", score: 1, unresolved: 1, unresolvedRecent: 1, heavyDays: 1 });
    expect(debt.guidance.length).toBeGreaterThan(0);
  });

  it("never counts today: an unfinished day isn't debt yet", () => {
    const debt = computeShadowDebt([day(TODAY, "EXPIRED", "EXPIRED", "EXPIRED")], TODAY);
    expect(debt.level).toBe("CLEAR");
  });

  it("decays on its own: the second week counts half, and beyond 14 days nothing counts", () => {
    const secondWeek = computeShadowDebt([day("2026-09-06", "EXPIRED", "EXPIRED")], TODAY); // 10 days ago
    expect(secondWeek.score).toBe(1);

    const ancient = computeShadowDebt([day("2026-08-20", "EXPIRED", "EXPIRED", "EXPIRED", "EXPIRED")], TODAY);
    expect(ancient).toMatchObject({ level: "CLEAR", score: 0, unresolved: 0 });
  });

  it("builds toward heavier levels as silent expiry becomes a pattern", () => {
    const building = computeShadowDebt(
      [day("2026-09-15", "EXPIRED", "EXPIRED"), day("2026-09-14", "EXPIRED", "COMPLETED")],
      TODAY,
    );
    expect(building.level).toBe("BUILDING");
    expect(building.guidance.some((line) => line.includes("Low energy"))).toBe(true);

    const heavy = computeShadowDebt(
      [
        day("2026-09-15", "EXPIRED", "EXPIRED"),
        day("2026-09-14", "EXPIRED", "EXPIRED"),
        day("2026-09-13", "EXPIRED"),
        day("2026-09-08", "EXPIRED", "EXPIRED"), // second week, half weight
      ],
      TODAY,
    );
    expect(heavy).toMatchObject({ level: "HEAVY", score: 6, unresolved: 7, unresolvedRecent: 5, heavyDays: 4 });
  });

  it("is deterministic: same days in, same debt out", () => {
    const days = [day("2026-09-15", "EXPIRED"), day("2026-09-10", "EXPIRED", "EXPIRED")];
    expect(computeShadowDebt(days, TODAY)).toEqual(computeShadowDebt(days, TODAY));
  });
});
