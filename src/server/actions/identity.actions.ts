"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { validationFailure, type ActionResult } from "@/lib/action-result";
import {
  appearanceSchema,
  interestSchema,
  lifeAreasSchema,
  preferencesSchema,
  profileSchema,
} from "@/modules/identity/schemas";
import { getCurrentUser } from "@/server/auth/current-user";
import * as identity from "@/server/services/identity.service";

// Every action re-validates its input: arguments to Server Functions arrive
// from the network and are never trusted.

async function run(task: (userId: string) => Promise<unknown>, message: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    await task(user.id);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof identity.IdentityError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: "Couldn't save right now. Please try again." };
  }
  // Identity appears in the shell and on every page.
  revalidatePath("/", "layout");
  return { ok: true, message };
}

export async function saveProfileAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    pronouns: formData.get("pronouns") ?? "",
    bio: formData.get("bio") ?? "",
    timezone: formData.get("timezone") ?? "",
  });
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => identity.updateProfile(userId, parsed.data), "Profile saved");
}

export async function saveAppearanceAction(input: unknown): Promise<ActionResult> {
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => identity.updateAppearance(userId, parsed.data), "Avatar saved");
}

export async function addInterestAction(input: unknown): Promise<ActionResult> {
  const parsed = interestSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => identity.addInterest(userId, parsed.data), "Interest added");
}

export async function removeInterestAction(interestId: unknown): Promise<ActionResult> {
  const parsed = z.string().min(1).max(64).safeParse(interestId);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => identity.removeInterest(userId, parsed.data), "Interest removed");
}

export async function saveLifeAreasAction(input: unknown): Promise<ActionResult> {
  const parsed = lifeAreasSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => identity.saveLifeAreas(userId, parsed.data), "Life areas saved");
}

export async function savePreferencesAction(input: unknown): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run((userId) => identity.savePreferences(userId, parsed.data), "Preferences saved");
}
