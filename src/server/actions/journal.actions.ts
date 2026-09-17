"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { validationFailure, type ActionResult } from "@/lib/action-result";
import { journalEntrySchema } from "@/modules/reflection/journal";
import { reflectionInputSchema } from "@/modules/reflection/reflection";
import { getCurrentUser } from "@/server/auth/current-user";
import * as journal from "@/server/services/journal.service";
import * as reflections from "@/server/services/reflection.service";

// Server Functions receive untrusted input: everything is re-parsed here.

const idSchema = z.string().min(1).max(64);

function failure(error: unknown): ActionResult {
  if (error instanceof journal.JournalError || error instanceof reflections.ReflectionError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function saveDailyReflectionAction(input: unknown): Promise<ActionResult> {
  const parsed = reflectionInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const user = await getCurrentUser();
    await reflections.saveReflection(user, parsed.data);
  } catch (error) {
    return failure(error);
  }
  // Reflections show on Home, the journal, and shape tomorrow's quests.
  revalidatePath("/", "layout");
  return { ok: true, message: "Reflection saved" };
}

export async function createJournalEntryAction(input: unknown): Promise<ActionResult> {
  const parsed = journalEntrySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  let entryId: string;
  try {
    const user = await getCurrentUser();
    entryId = (await journal.createEntry(user, parsed.data)).id;
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/journal");
  redirect(`/journal/${entryId}`);
}

export async function updateJournalEntryAction(entryId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(entryId);
  if (!id.success) return validationFailure(id.error);
  const parsed = journalEntrySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const user = await getCurrentUser();
    await journal.updateEntry(user, id.data, parsed.data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/journal");
  redirect(`/journal/${id.data}`);
}

export async function deleteJournalEntryAction(entryId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(entryId);
  if (!id.success) return validationFailure(id.error);
  try {
    const user = await getCurrentUser();
    await journal.deleteEntry(user, id.data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/journal");
  redirect("/journal");
}
