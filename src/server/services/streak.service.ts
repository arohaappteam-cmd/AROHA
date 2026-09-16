import "server-only";

import type { User } from "@/generated/prisma/client";
import { todayInTimezone } from "@/modules/goals/dates";
import { baseTemplateKey } from "@/modules/quests/templates";
import { bestActiveStreak, computeStreaks, type StreakState } from "@/modules/streaks/streaks";
import { db } from "@/server/db";

/**
 * Streaks (spec §18), derived on read from the completion ledger. Nothing is
 * stored, so an undone quest or a missed day recomputes honestly — and the
 * lifetime totals can only ever grow.
 */

type UserLike = Pick<User, "id" | "timezone">;

export async function getStreaks(user: UserLike): Promise<StreakState[]> {
  const completions = await db.questCompletion.findMany({
    where: { userId: user.id },
    select: { completedAt: true, quest: { select: { lifeArea: true, templateKey: true } } },
  });

  const today = todayInTimezone(user.timezone);
  return computeStreaks(
    completions.map((completion) => ({
      // The user's calendar day, not the server's.
      date: todayInTimezone(user.timezone, completion.completedAt),
      lifeArea: completion.quest.lifeArea,
      templateKey: baseTemplateKey(completion.quest.templateKey),
    })),
    today,
  );
}

export async function getBestActiveStreak(user: UserLike): Promise<StreakState | null> {
  return bestActiveStreak(await getStreaks(user));
}
