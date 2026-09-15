import "server-only";

import type { GeneratedDay, QuestDraft, QuestGenerationContext, QuestGenerator } from "@/modules/quests/context";
import { ruleBasedQuestGenerator } from "@/modules/quests/generator";
import { MENTOR_SYSTEM, questPersonalisationPrompt } from "@/modules/mentor/prompts";
import { questContentSetSchema } from "@/modules/mentor/schemas";

import { generateStructured, getAIProvider } from "./index";

/**
 * AI-personalised daily quests, wrapping the deterministic generator.
 *
 * The rule-based generator always produces a valid, balanced day first. When
 * AI is available, the model rewrites the wording and calibration of the four
 * non-goal core quests (PHYSICAL, MENTAL, LEARNING, SOCIAL). The backend keeps
 * ownership of structure, payloads, goal linkage and XP (spec §6): the goal
 * quest, carry-overs and the bonus quest stay exactly as the deterministic
 * engine built them, and anything the model gets wrong is ignored.
 */
export const aiQuestGenerator: QuestGenerator = {
  name: "ai-mentor",

  async generateDay(ctx: QuestGenerationContext): Promise<GeneratedDay> {
    const baseline = await ruleBasedQuestGenerator.generateDay(ctx);
    const provider = getAIProvider();
    // Carry-overs are deterministic promises to the user; don't let AI reword them.
    if (!provider || ctx.carryOvers.length > 0) return baseline;

    const editable = baseline.drafts.filter(
      (d) => d.isCore && d.slot !== "PERSONAL_GOAL" && !d.carriedFromId,
    );

    try {
      const set = await generateStructured(provider, {
        task: "quests.personalise-daily",
        schema: questContentSetSchema,
        system: MENTOR_SYSTEM,
        prompt: questPersonalisationPrompt(),
        input: {
          date: ctx.date,
          energy: ctx.energy,
          preferences: ctx.preferences,
          interests: ctx.interests.map((i) => i.label),
          focusAreas: ctx.focusAreas,
          previousOutcomes: ctx.previousOutcomes,
          quests: editable.map((d) => ({ slot: d.slot, lifeArea: d.lifeArea, currentTitle: d.title })),
        },
      });

      const bySlot = new Map(set.quests.map((q) => [q.slot, q]));
      const drafts: QuestDraft[] = baseline.drafts.map((draft) => {
        const content = bySlot.get(draft.slot as (typeof set.quests)[number]["slot"]);
        // Only reword editable slots; keep everything structural.
        if (!content || !editable.includes(draft)) return draft;
        return {
          ...draft,
          title: content.title,
          description: content.description,
          steps: content.steps,
          difficulty: content.difficulty,
          estimatedMinutes: content.estimatedMinutes,
          rationale: content.rationale,
        };
      });

      return {
        drafts,
        rationale: set.rationale || baseline.rationale,
        generator: provider.name,
      };
    } catch (error) {
      console.warn("[ai] daily quests fell back to templates:", error instanceof Error ? error.message : error);
      return baseline;
    }
  },

  // Swaps and single-slot regeneration stay deterministic.
  generateSlot(ctx, slot, options) {
    return ruleBasedQuestGenerator.generateSlot(ctx, slot, options);
  },
};

export function selectQuestGenerator(): QuestGenerator {
  return getAIProvider() ? aiQuestGenerator : ruleBasedQuestGenerator;
}
