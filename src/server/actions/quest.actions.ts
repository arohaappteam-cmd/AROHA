"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { validationFailure, type ActionResult, type ActionResultWith } from "@/lib/action-result";
import type { QuestCompletionPayload } from "@/modules/quests/completion";
import {
  completeQuestSchema,
  energySchema,
  questIdSchema,
  reflectionSchema,
  skipQuestSchema,
} from "@/modules/quests/schemas";
import { getCurrentUser } from "@/server/auth/current-user";
import * as quests from "@/server/services/quest.service";

// Server Functions receive untrusted input: everything is re-parsed here.

type User = Awaited<ReturnType<typeof getCurrentUser>>;

async function run(task: (user: User) => Promise<unknown>, message?: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    await task(user);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof quests.QuestError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  // Quests show on Home, the quest page, goals and the character.
  revalidatePath("/", "layout");
  return { ok: true, message };
}

function withId(questId: unknown, task: (user: User, id: string) => Promise<unknown>, message?: string) {
  const parsed = questIdSchema.safeParse(questId);
  if (!parsed.success) return Promise.resolve(validationFailure(parsed.error));
  return run((user) => task(user, parsed.data), message);
}

export async function startQuestAction(questId: unknown): Promise<ActionResult> {
  return withId(questId, quests.startQuest, "Quest started — go live it");
}

/** Returns the progression outcome so the UI can celebrate a level-up. */
export async function completeQuestAction(input: unknown): Promise<ActionResultWith<QuestCompletionPayload>> {
  const parsed = completeQuestSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const user = await getCurrentUser();
    const result = await quests.completeQuest(user, parsed.data);
    const { missionCompleted, progression, skill, challenges, experiment, achievements } = result;
    revalidatePath("/", "layout");

    const xp = progression.xpAwarded > 0 ? ` +${progression.xpAwarded} XP` : "";
    const notes: string[] = [];
    if (skill?.awarded) {
      notes.push(
        skill.leveledUp
          ? `${skill.skillName} ${skill.mastered ? "mastered!" : `reached level ${skill.level}`}`
          : `${skill.skillName} +${skill.xpAwarded} skill XP`,
      );
    }
    for (const credit of challenges?.credited ?? []) {
      notes.push(
        credit.completed
          ? `${credit.title} complete! +${credit.xpAwarded} XP`
          : `${credit.title}: day ${credit.daysDone} of ${credit.targetDays}`,
      );
    }
    if (experiment) {
      notes.push(`${experiment.daysPracticed} practice day${experiment.daysPracticed === 1 ? "" : "s"} in your experiment`);
    }
    for (const achievement of achievements) {
      notes.push(`Achievement: ${achievement.name}${achievement.xpReward > 0 ? ` +${achievement.xpReward} XP` : ""}`);
    }
    const suffix = notes.length > 0 ? ` · ${notes.join(" · ")}` : "";
    return {
      ok: true,
      message: (missionCompleted ? `Quest complete — and the mission is done.${xp}` : `Quest complete.${xp}`) + suffix,
      data: result,
    };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof quests.QuestError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function saveReflectionAction(input: unknown): Promise<ActionResult> {
  const parsed = reflectionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((user) => quests.saveReflection(user, parsed.data), "Reflection saved");
}

export async function undoCompletionAction(questId: unknown): Promise<ActionResult> {
  return withId(questId, quests.undoCompletion, "Marked as not done");
}

export async function skipQuestAction(input: unknown): Promise<ActionResult> {
  const parsed = skipQuestSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((user) => quests.skipQuest(user, parsed.data.questId, parsed.data.reason), "No problem — tomorrow adapts");
}

export async function deferQuestAction(questId: unknown): Promise<ActionResult> {
  return withId(questId, quests.deferQuest, "Moved to tomorrow");
}

export async function restoreQuestAction(questId: unknown): Promise<ActionResult> {
  return withId(questId, quests.restoreQuest, "Quest is back on");
}

export async function swapQuestAction(questId: unknown): Promise<ActionResult> {
  return withId(questId, quests.swapQuest, "Here's a different quest");
}

export async function setDayEnergyAction(energy: unknown): Promise<ActionResult> {
  const parsed = energySchema.safeParse(energy);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((user) => quests.setDayEnergy(user, parsed.data), "Today adjusted to your energy");
}
