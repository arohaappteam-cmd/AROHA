"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { validationFailure, type ActionResult } from "@/lib/action-result";
import {
  groupKeySchema,
  guildSlugSchema,
  mentorshipNoteSchema,
  mentorshipRequestSchema,
  mentorshipResponseSchema,
  socialProfileSchema,
} from "@/modules/social/schemas";
import { getCurrentUser } from "@/server/auth/current-user";
import * as social from "@/server/services/social.service";

// Server Functions receive untrusted input: everything is re-parsed here.

const idSchema = z.string().min(1).max(60);

async function run(task: () => Promise<unknown>, message: string): Promise<ActionResult> {
  try {
    await task();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof social.SocialError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  // Community state shows across the section, and group challenges reach Journey and Home.
  revalidatePath("/", "layout");
  return { ok: true, message };
}

export async function joinGuildAction(slug: unknown): Promise<ActionResult> {
  const parsed = guildSlugSchema.safeParse(slug);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => social.joinGuild(user, parsed.data), "You're in. The guild's ritual shows up on its page each week.");
}

export async function leaveGuildAction(slug: unknown): Promise<ActionResult> {
  const parsed = guildSlugSchema.safeParse(slug);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => social.leaveGuild(user, parsed.data), "Left the guild. Nothing you earned goes with it.");
}

export async function joinGroupChallengeAction(groupKey: unknown): Promise<ActionResult> {
  const parsed = groupKeySchema.safeParse(groupKey);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(
    () => social.joinGroupChallenge(user, parsed.data),
    "You're in — your own challenge has started. Days are earned by completing matching quests, same as always.",
  );
}

export async function leaveGroupChallengeAction(groupKey: unknown): Promise<ActionResult> {
  const parsed = groupKeySchema.safeParse(groupKey);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(
    () => social.leaveGroupChallenge(user, parsed.data),
    "Left the group. Your challenge keeps running — set it down on Journey if you'd rather stop.",
  );
}

export async function requestMentorshipAction(input: unknown): Promise<ActionResult> {
  const parsed = mentorshipRequestSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(
    () => social.requestMentorship(user, parsed.data),
    "Request sent. It shows up on their Mentorship page, and they can accept or decline.",
  );
}

export async function respondMentorshipAction(input: unknown): Promise<ActionResult> {
  const parsed = mentorshipResponseSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(
    () => social.respondToMentorship(user, parsed.data.mentorshipId, parsed.data.accept),
    parsed.data.accept ? "Accepted. You can leave each other notes from the mentorship page." : "Declined. They won't be told why.",
  );
}

export async function endMentorshipAction(mentorshipId: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(mentorshipId);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => social.endMentorship(user, parsed.data), "Closed. It stays in your record.");
}

export async function sendMentorshipNoteAction(input: unknown): Promise<ActionResult> {
  const parsed = mentorshipNoteSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => social.sendMentorshipMessage(user, parsed.data.mentorshipId, parsed.data.body), "Sent.");
}

export async function saveSocialProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = socialProfileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await getCurrentUser();
  return run(() => social.saveSocialProfile(user, parsed.data), "Sharing settings saved.");
}
