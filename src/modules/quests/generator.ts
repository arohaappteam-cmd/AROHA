import type { ChallengeLevel, DayEnergy, QuestDifficulty } from "@/generated/prisma/enums";
import { LIFE_AREAS } from "@/modules/identity/life-areas";

import { CORE_SLOTS, SLOT_TIME_SHARE, type QuestSlot } from "./categories";
import {
  questDraftSchema,
  type GeneratedDay,
  type QuestDraft,
  type QuestGenerationContext,
  type QuestGenerator,
} from "./context";
import { createRng, weightedPick } from "./random";
import {
  baseTemplateKey,
  QUEST_TEMPLATES,
  recordedTemplateKey,
  templatesForSlot,
  type QuestTemplate,
} from "./templates";

/**
 * Deterministic, rule-based daily quest generation (spec §4). Same context →
 * same day. Personalisation hooks: preferences, energy, interests, focus
 * areas, the major goal's next step, recent history and deferred quests.
 */

export const RULE_BASED_GENERATOR = "rule-based@1";

const ENERGY_TIME: Record<DayEnergy, number> = { LOW: 0.5, NORMAL: 1, HIGH: 1.25 };
const CHALLENGE_TIME: Record<ChallengeLevel, number> = { GENTLE: 0.8, BALANCED: 1, AMBITIOUS: 1.2 };
const DIFFICULTIES: QuestDifficulty[] = ["EASY", "MEDIUM", "HARD"];
/** How many recent template keys count as "recent" for repeat avoidance. */
const RECENT_WINDOW = 15;
const BONUS_TIME_SHARE = 0.2;

function snap(minutes: number, step = 5) {
  return Math.max(step, Math.round(minutes / step) * step);
}

export function minutesFor(ctx: QuestGenerationContext, slot: QuestSlot, template: QuestTemplate): number {
  const share = slot === "BONUS" ? BONUS_TIME_SHARE : SLOT_TIME_SHARE[slot];
  const raw = ctx.preferences.dailyMinutes * share * ENERGY_TIME[ctx.energy] * CHALLENGE_TIME[ctx.preferences.challengeLevel];
  const step = template.maxMinutes <= 10 ? 1 : 5;
  const upper = ctx.energy === "LOW" ? Math.max(template.minMinutes, Math.min(template.maxMinutes, 15)) : template.maxMinutes;
  return Math.min(upper, Math.max(template.minMinutes, snap(raw, step)));
}

export function difficultyFor(ctx: QuestGenerationContext, slot: QuestSlot, template: QuestTemplate): QuestDifficulty {
  let level = DIFFICULTIES.indexOf(template.difficulty);
  if (ctx.energy === "LOW") level -= 1;
  if (ctx.energy === "HIGH") level += 1;
  if (ctx.preferences.challengeLevel === "GENTLE") level -= 1;
  if (ctx.preferences.challengeLevel === "AMBITIOUS") level += 1;
  if (ctx.previousOutcomes[slot] === "SKIPPED") level -= 1;
  return DIFFICULTIES[Math.min(2, Math.max(0, level))];
}

function rationaleFor(ctx: QuestGenerationContext, slot: QuestSlot, template: QuestTemplate, reason?: string): string {
  const reasons: string[] = [];
  if (reason) reasons.push(reason);
  if (ctx.focusAreas.includes(template.lifeArea) && slot !== "BONUS") {
    reasons.push(`${LIFE_AREAS[template.lifeArea].label.toLowerCase()} is one of your focus areas`);
  }
  if (ctx.previousOutcomes[slot] === "SKIPPED") reasons.push("yesterday's didn't work out, so today's is simpler");
  if (ctx.energy === "LOW") reasons.push("it's light enough for a low-energy day");
  if (ctx.energy === "HIGH") reasons.push("you've got energy to spare today");
  if (reasons.length === 0) return "Part of a balanced day.";
  const sentence = reasons.join(", and ");
  return `Chosen because ${sentence}.`.slice(0, 240);
}

function pickTemplate(
  ctx: QuestGenerationContext,
  slot: QuestSlot,
  rng: () => number,
  { exclude = [], avoidTags = new Set<string>() }: { exclude?: string[]; avoidTags?: Set<string> } = {},
): QuestTemplate | null {
  const recent = new Set(ctx.recentTemplateKeys.slice(0, RECENT_WINDOW).map(baseTemplateKey));
  const previouslySkipped = ctx.previousOutcomes[slot] === "SKIPPED";
  const candidates = templatesForSlot(slot).filter((t) => !exclude.includes(t.key));

  const weight = (t: QuestTemplate) => {
    let w = t.weight(ctx);
    if (recent.has(t.key)) w *= 0.25;
    if (previouslySkipped) w *= t.difficulty === "EASY" ? 2 : 0.5;
    return w;
  };

  const withoutClashes = candidates.filter((t) => !t.tags?.some((tag) => avoidTags.has(tag)));
  return weightedPick(withoutClashes, weight, rng) ?? weightedPick(candidates, weight, rng);
}

function draftFrom(ctx: QuestGenerationContext, slot: QuestSlot, template: QuestTemplate, rng: () => number): QuestDraft {
  const planned = minutesFor(ctx, slot, template);
  const built = template.build(ctx, planned, rng);
  const draft: QuestDraft = {
    slot,
    lifeArea: template.lifeArea,
    isCore: slot !== "BONUS",
    templateKey: recordedTemplateKey(template, built),
    title: built.title,
    description: built.description,
    steps: built.steps,
    payload: built.payload,
    difficulty: difficultyFor(ctx, slot, template),
    estimatedMinutes: built.minutes ?? planned,
    rationale: rationaleFor(ctx, slot, template, built.reason),
    goalId: built.goalId ?? null,
    missionId: built.missionId ?? null,
    carriedFromId: null,
  };
  // Generators must satisfy the same contract a future AI generator will.
  questDraftSchema.parse(draft);
  return draft;
}

function templateOf(recordedKey: string): QuestTemplate | undefined {
  const base = baseTemplateKey(recordedKey);
  return QUEST_TEMPLATES.find((t) => t.key === base);
}

function seed(ctx: QuestGenerationContext, slot: QuestSlot, nonce: number) {
  return `${ctx.userId}:${ctx.date}:${slot}:${nonce}`;
}

export function generateDay(ctx: QuestGenerationContext): GeneratedDay {
  const drafts: QuestDraft[] = [];
  const usedTags = new Set<string>();

  for (const slot of CORE_SLOTS) {
    const carry = ctx.carryOvers.find((c) => c.draft.slot === slot);
    if (carry) {
      drafts.push({
        ...carry.draft,
        carriedFromId: carry.questId,
        rationale: "You moved this to today. Fresh start — no pressure.",
      });
      templateOf(carry.draft.templateKey)?.tags?.forEach((tag) => usedTags.add(tag));
      continue;
    }

    const rng = createRng(seed(ctx, slot, 0));
    const template = pickTemplate(ctx, slot, rng, { avoidTags: usedTags });
    if (!template) throw new Error(`No quest template available for ${slot}`);
    template.tags?.forEach((tag) => usedTags.add(tag));
    drafts.push(draftFrom(ctx, slot, template, rng));
  }

  // One optional bonus quest for a creative or exploratory focus area.
  if (ctx.energy !== "LOW") {
    const rng = createRng(seed(ctx, "BONUS", 0));
    const template = pickTemplate(ctx, "BONUS", rng, { avoidTags: usedTags });
    if (template) drafts.push(draftFrom(ctx, "BONUS", template, rng));
  }

  const coreMinutes = drafts.filter((d) => d.isCore).reduce((sum, d) => sum + d.estimatedMinutes, 0);
  const notes = [
    ctx.energy === "LOW" ? "lighter than usual — rest counts too" : null,
    ctx.energy === "HIGH" ? "a little more ambitious while the energy is there" : null,
    ctx.majorGoal?.next?.missionTitle ? `moving “${ctx.majorGoal.title}” forward` : null,
  ].filter(Boolean);

  return {
    drafts,
    rationale: `A balanced day of about ${coreMinutes} minutes${notes.length ? `, ${notes.join(", ")}` : ""}.`,
    generator: RULE_BASED_GENERATOR,
  };
}

/**
 * A replacement quest for one slot. `nonce` changes the seed so each swap is
 * different but still reproducible; excluded templates are never repeated.
 */
export function generateSlot(
  ctx: QuestGenerationContext,
  slot: QuestSlot,
  { nonce, excludeTemplateKeys, avoidTags = [] }: { nonce: number; excludeTemplateKeys: string[]; avoidTags?: string[] },
): QuestDraft | null {
  const rng = createRng(seed(ctx, slot, nonce));
  const exclude = excludeTemplateKeys.map(baseTemplateKey);
  const template = pickTemplate(ctx, slot, rng, { exclude, avoidTags: new Set(avoidTags) });
  return template ? draftFrom(ctx, slot, template, rng) : null;
}

/** Tags of a recorded template key, for clash avoidance across a day. */
export function tagsOf(recordedKey: string): string[] {
  return templateOf(recordedKey)?.tags ?? [];
}

export const ruleBasedQuestGenerator: QuestGenerator = {
  name: RULE_BASED_GENERATOR,
  async generateDay(context) {
    return generateDay(context);
  },
  async generateSlot(context, slot, options) {
    return generateSlot(context, slot, options);
  },
};
