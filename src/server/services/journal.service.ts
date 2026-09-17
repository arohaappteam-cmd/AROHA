import "server-only";

import type { User } from "@/generated/prisma/client";
import { daysBetween, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import type { JournalEntryInput } from "@/modules/reflection/journal";
import { journalRepository } from "@/server/repositories/journal.repository";

/**
 * The private journal (spec §42). Entries belong to their author alone: this
 * service is the only way to reach them, every call is scoped to the owner,
 * and nothing here is shared with the passport, timeline, mentor or AI.
 */

export class JournalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JournalError";
  }
}

type UserLike = Pick<User, "id" | "timezone">;

function entryData(user: UserLike, input: JournalEntryInput) {
  if (daysBetween(input.date, todayInTimezone(user.timezone)) < 0) {
    throw new JournalError("Journal entries can't be dated in the future");
  }
  return { date: parseDateOnly(input.date), title: input.title, body: input.body, mood: input.mood };
}

export const PAGE_SIZE = 20;
const MAX_SHOWN = 500;

/** The newest `limit` entries, plus whether there are more. */
export async function listEntries(user: UserLike, limit = PAGE_SIZE) {
  const shown = Math.min(MAX_SHOWN, Math.max(PAGE_SIZE, Math.floor(limit)));
  const [entries, total] = await Promise.all([journalRepository.list(user.id, shown), journalRepository.count(user.id)]);
  return { entries, hasMore: total > entries.length, total, shown };
}

export async function getEntry(user: UserLike, entryId: string) {
  return journalRepository.findOwned(user.id, entryId);
}

export async function createEntry(user: UserLike, input: JournalEntryInput) {
  return journalRepository.create(user.id, entryData(user, input));
}

export async function updateEntry(user: UserLike, entryId: string, input: JournalEntryInput) {
  const updated = await journalRepository.updateOwned(user.id, entryId, entryData(user, input));
  if (!updated) throw new JournalError("That entry doesn't exist");
}

export async function deleteEntry(user: UserLike, entryId: string) {
  const deleted = await journalRepository.deleteOwned(user.id, entryId);
  if (!deleted) throw new JournalError("That entry doesn't exist");
}
