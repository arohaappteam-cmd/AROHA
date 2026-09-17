import { describe, expect, it } from "vitest";

import { findTreeSpec } from "@/modules/skills/catalogue";

import { PROJECT_CATEGORY_LIST } from "./categories";
import { projectSkillXp, projectXpReward } from "./rewards";
import { evidenceInputSchema, projectInputSchema } from "./schemas";
import { canTransitionProject, completionBlocker, nextProjectStatus } from "./status";

describe("project categories", () => {
  it("suggest only skill trees that exist", () => {
    for (const category of PROJECT_CATEGORY_LIST) {
      for (const tree of category.suggestedTrees) expect(findTreeSpec(tree), `${category.key} → ${tree}`).toBeDefined();
    }
  });
});

describe("project lifecycle", () => {
  it("allows only sensible transitions", () => {
    expect(canTransitionProject("PLANNING", "start")).toBe(true);
    expect(canTransitionProject("IN_PROGRESS", "pause")).toBe(true);
    expect(canTransitionProject("PAUSED", "resume")).toBe(true);
    expect(canTransitionProject("IN_PROGRESS", "complete")).toBe(true);
    expect(canTransitionProject("COMPLETED", "reopen")).toBe(true);
    expect(canTransitionProject("COMPLETED", "complete")).toBe(false);
    expect(canTransitionProject("PLANNING", "pause")).toBe(false);
    expect(nextProjectStatus("reopen")).toBe("IN_PROGRESS");
    expect(nextProjectStatus("complete")).toBe("COMPLETED");
  });

  it("refuses completion without evidence or skills — proof over claims", () => {
    expect(completionBlocker({ evidenceCount: 0, skillCount: 2 })).toMatch(/evidence/);
    expect(completionBlocker({ evidenceCount: 1, skillCount: 0 })).toMatch(/skill/);
    expect(completionBlocker({ evidenceCount: 1, skillCount: 1 })).toBeNull();
  });
});

describe("project rewards", () => {
  it("grows with milestones and evidence, capped", () => {
    expect(projectXpReward(0, 1)).toBe(110);
    expect(projectXpReward(3, 2)).toBe(180);
    expect(projectXpReward(50, 50)).toBe(230);
    expect(projectXpReward(50, 50)).toBeLessThanOrEqual(300);
  });

  it("pays deeper skills more", () => {
    expect(projectSkillXp(30)).toBe(45);
    expect(projectSkillXp(150)).toBe(225);
    expect(projectSkillXp(1000)).toBe(300);
  });
});

describe("project inputs", () => {
  it("validates and de-duplicates skills", () => {
    const parsed = projectInputSchema.parse({ title: "Bakery app", category: "SOFTWARE", skillIds: ["a", "a", "b"], description: "" });
    expect(parsed).toMatchObject({ title: "Bakery app", description: null, skillIds: ["a", "b"], milestones: [] });
    expect(projectInputSchema.safeParse({ title: "x", category: "SOFTWARE" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ title: "Too many", category: "ART", skillIds: ["1", "2", "3", "4", "5", "6", "7"] }).success).toBe(false);
  });

  it("requires a real link, unless the evidence is a written note", () => {
    expect(evidenceInputSchema.safeParse({ projectId: "p", kind: "LINK", title: "Demo", url: "https://example.com" }).success).toBe(true);
    expect(evidenceInputSchema.safeParse({ projectId: "p", kind: "LINK", title: "Demo", url: "" }).success).toBe(false);
    expect(evidenceInputSchema.safeParse({ projectId: "p", kind: "LINK", title: "Demo", url: "javascript:alert(1)" }).success).toBe(false);
    expect(evidenceInputSchema.safeParse({ projectId: "p", kind: "NOTE", title: "Write-up", url: "", note: "What I built and how." }).success).toBe(true);
  });
});
