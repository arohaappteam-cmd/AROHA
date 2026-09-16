import "server-only";

import type { User } from "@/generated/prisma/client";
import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { computeShadowDebt, DEBT_WINDOW_DAYS, type ShadowDebt } from "@/modules/shadow/debt";
import { questRepository } from "@/server/repositories/quest.repository";

/**
 * Shadow Debt (spec §29), computed on read from recent day outcomes. Nothing
 * is stored and nothing is deducted — it is a mirror, not a penalty.
 */

type UserLike = Pick<User, "id" | "timezone">;

export async function getShadowDebt(user: UserLike): Promise<ShadowDebt> {
  const today = todayInTimezone(user.timezone);
  const to = parseDateOnly(today);
  const from = new Date(to.getTime() - DEBT_WINDOW_DAYS * 86_400_000);

  const days = await questRepository.daySummaries(user.id, from, to);
  return computeShadowDebt(
    days.map((day) => ({
      date: formatDateOnly(day.date),
      core: day.quests.map((quest) => quest.status),
    })),
    today,
  );
}
