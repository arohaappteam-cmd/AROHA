import "server-only";

import type { DayMood } from "@/generated/prisma/enums";
import { db } from "@/server/db";

type EntryData = { date: Date; title: string | null; body: string; mood: DayMood | null };

/**
 * Private journal entries. Every read and write is scoped to the owner, so
 * one user's entries can never be loaded, changed or deleted by another.
 */
export const journalRepository = {
  list(userId: string, limit: number) {
    return db.journalEntry.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  },

  count(userId: string) {
    return db.journalEntry.count({ where: { userId } });
  },

  findOwned(userId: string, entryId: string) {
    return db.journalEntry.findFirst({ where: { id: entryId, userId } });
  },

  create(userId: string, data: EntryData) {
    return db.journalEntry.create({ data: { userId, ...data } });
  },

  async updateOwned(userId: string, entryId: string, data: EntryData): Promise<boolean> {
    const result = await db.journalEntry.updateMany({ where: { id: entryId, userId }, data });
    return result.count === 1;
  },

  async deleteOwned(userId: string, entryId: string): Promise<boolean> {
    const result = await db.journalEntry.deleteMany({ where: { id: entryId, userId } });
    return result.count === 1;
  },
};
