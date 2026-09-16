import "server-only";

import type { User } from "@/generated/prisma/client";
import type { LifeArea } from "@/generated/prisma/enums";
import { CHALLENGE_TEMPLATES, findChallengeTemplate, type ChallengeTemplate } from "@/modules/challenges/catalogue";
import {
  challengeProgress,
  challengeTargetDays,
  challengeXpReward,
  isWithinWindow,
  questEarnsChallengeDay,
  type ChallengeProgress,
} from "@/modules/challenges/logic";
import type { ChallengeCredit, ChallengeQuestOutcome } from "@/modules/challenges/outcome";
import { formatDateOnly, parseDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { awardXp, revokeXp } from "@/server/progression/engine";
import { challengeRepository, type ChallengeWithDays } from "@/server/repositories/challenge.repository";

/**
 * Challenges (spec §11): temporary commitments earned through real quests.
 * All rules are deterministic and backend-owned — windows, grace, targets and
 * XP come from the logic module, never from templates at face value or AI.
 *
 * Two active challenges at most: the point is realistic commitment, not a
 * wall of parallel obligations (spec §29).
 */

export const MAX_ACTIVE_CHALLENGES = 2;

export class ChallengeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChallengeError";
  }
}

type UserLike = Pick<User, "id" | "timezone">;

/** A challenge whose window closed short of the target simply ends — kindly. */
async function settleExpiredWindows(challenges: ChallengeWithDays[], today: string): Promise<ChallengeWithDays[]> {
  const settled: ChallengeWithDays[] = [];
  for (const challenge of challenges) {
    const startDate = formatDateOnly(challenge.startDate);
    if (challenge.status === "ACTIVE" && !isWithinWindow(startDate, challenge.durationDays, today)) {
      await challengeRepository.setStatus(challenge.id, "ENDED", new Date());
      settled.push({ ...challenge, status: "ENDED", endedAt: new Date() });
    } else {
      settled.push(challenge);
    }
  }
  return settled;
}

// ─── Views ───────────────────────────────────────────────────────────────────

export type ChallengeView = {
  id: string;
  templateKey: string;
  title: string;
  description: string | null;
  emoji: string;
  lifeArea: LifeArea;
  durationDays: number;
  status: ChallengeWithDays["status"];
  startDate: string;
  progress: ChallengeProgress;
  /** True when today has already been credited. */
  earnedToday: boolean;
  completedAt: Date | null;
};

export type ChallengeTemplateView = Pick<
  ChallengeTemplate,
  "key" | "title" | "description" | "emoji" | "lifeArea" | "durationDays"
> & { targetDays: number; xpReward: number };

export type ChallengesOverview = {
  active: ChallengeView[];
  past: ChallengeView[];
  /** Templates that can be started right now. */
  available: ChallengeTemplateView[];
  /** False once the active limit is reached. */
  canStart: boolean;
};

function toView(challenge: ChallengeWithDays, today: string): ChallengeView {
  const startDate = formatDateOnly(challenge.startDate);
  return {
    id: challenge.id,
    templateKey: challenge.templateKey,
    title: challenge.title,
    description: challenge.description,
    emoji: challenge.emoji,
    lifeArea: challenge.lifeArea,
    durationDays: challenge.durationDays,
    status: challenge.status,
    startDate,
    progress: challengeProgress(
      { startDate, durationDays: challenge.durationDays, targetDays: challenge.targetDays },
      challenge.days.length,
      today,
    ),
    earnedToday: challenge.days.some((day) => formatDateOnly(day.date) === today),
    completedAt: challenge.completedAt,
  };
}

export async function getChallengesOverview(user: UserLike): Promise<ChallengesOverview> {
  const today = todayInTimezone(user.timezone);
  const challenges = await settleExpiredWindows(await challengeRepository.list(user.id), today);

  const active = challenges.filter((challenge) => challenge.status === "ACTIVE");
  const past = challenges.filter((challenge) => challenge.status !== "ACTIVE");
  const activeKeys = new Set(active.map((challenge) => challenge.templateKey));
  const canStart = active.length < MAX_ACTIVE_CHALLENGES;

  return {
    active: active.map((challenge) => toView(challenge, today)),
    past: past.map((challenge) => toView(challenge, today)).slice(0, 12),
    available: CHALLENGE_TEMPLATES.filter((template) => !activeKeys.has(template.key)).map((template) => {
      const targetDays = challengeTargetDays(template.durationDays);
      return {
        key: template.key,
        title: template.title,
        description: template.description,
        emoji: template.emoji,
        lifeArea: template.lifeArea,
        durationDays: template.durationDays,
        targetDays,
        xpReward: challengeXpReward(targetDays),
      };
    }),
    canStart,
  };
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export async function startChallenge(user: UserLike, templateKey: string) {
  const template = findChallengeTemplate(templateKey);
  if (!template) throw new ChallengeError("That challenge doesn't exist");

  const today = todayInTimezone(user.timezone);
  const active = await settleExpiredWindows(await challengeRepository.listActive(user.id), today);
  const stillActive = active.filter((challenge) => challenge.status === "ACTIVE");
  if (stillActive.some((challenge) => challenge.templateKey === templateKey)) {
    throw new ChallengeError("That challenge is already running");
  }
  if (stillActive.length >= MAX_ACTIVE_CHALLENGES) {
    throw new ChallengeError(
      `Two challenges at a time is plenty — finish or set one down first. Commitments you can keep beat commitments you can count.`,
    );
  }

  const targetDays = challengeTargetDays(template.durationDays);
  return challengeRepository.create({
    userId: user.id,
    templateKey: template.key,
    title: template.title,
    description: template.description,
    emoji: template.emoji,
    lifeArea: template.lifeArea,
    durationDays: template.durationDays,
    targetDays,
    xpReward: challengeXpReward(targetDays),
    startDate: parseDateOnly(today),
  });
}

/** Setting a challenge down is a decision, not a failure. Days earned stay earned. */
export async function abandonChallenge(user: UserLike, challengeId: string) {
  const challenge = await challengeRepository.findOwned(user.id, challengeId);
  if (!challenge) throw new ChallengeError("That challenge doesn't exist");
  if (challenge.status !== "ACTIVE") throw new ChallengeError("Only a running challenge can be set down");
  await challengeRepository.setStatus(challengeId, "ABANDONED", new Date());
}

// ─── Quest integration ───────────────────────────────────────────────────────

export type ChallengeQuestEvent = {
  userId: string;
  timezone: string;
  questId: string;
  lifeArea: LifeArea;
  /** Base template key (no variant suffix). */
  templateKey: string;
  /** Slug of the skill tree the quest trained, when it trained one. */
  skillTree: string | null;
};

/**
 * Credits today to every active challenge the completed quest matches, and
 * completes challenges whose target is reached. Idempotent per day.
 */
export async function questCompleted(event: ChallengeQuestEvent): Promise<ChallengeQuestOutcome> {
  const today = todayInTimezone(event.timezone);
  const active = await settleExpiredWindows(await challengeRepository.listActive(event.userId), today);

  const credited: ChallengeCredit[] = [];
  for (const challenge of active) {
    if (challenge.status !== "ACTIVE") continue;
    const template = findChallengeTemplate(challenge.templateKey);
    if (!template) continue;
    if (!isWithinWindow(formatDateOnly(challenge.startDate), challenge.durationDays, today)) continue;
    if (!questEarnsChallengeDay(template.match, { lifeArea: event.lifeArea, templateKey: event.templateKey, skillTree: event.skillTree })) {
      continue;
    }

    const isNewDay = await challengeRepository.creditDay(challenge.id, event.userId, parseDateOnly(today), event.questId);
    if (!isNewDay) continue; // today already earned by an earlier quest

    const daysDone = await challengeRepository.countDays(challenge.id);
    const completed = daysDone >= challenge.targetDays;
    let xpAwarded = 0;
    if (completed) {
      await challengeRepository.setStatus(challenge.id, "COMPLETED", new Date());
      const outcome = await awardXp({
        userId: event.userId,
        amount: challenge.xpReward,
        sourceType: "CHALLENGE_COMPLETION",
        // One bonus per challenge instance, ever.
        sourceId: challenge.id,
        lifeArea: challenge.lifeArea,
        reason: `Challenge complete: ${challenge.title}`,
      });
      xpAwarded = outcome.xpAwarded;
    }

    credited.push({
      id: challenge.id,
      title: challenge.title,
      emoji: challenge.emoji,
      daysDone,
      targetDays: challenge.targetDays,
      completed,
      xpAwarded,
    });
  }
  return { credited };
}

/**
 * Removes exactly the credit an undone quest earned. A challenge completed by
 * that credit reverts (window still open → ACTIVE, otherwise ENDED) and its
 * bonus XP is revoked.
 */
export async function questCompletionReverted(user: UserLike, questId: string): Promise<void> {
  const affectedIds = await challengeRepository.removeCreditsForQuest(user.id, questId);
  if (affectedIds.length === 0) return;

  const today = todayInTimezone(user.timezone);
  for (const challengeId of affectedIds) {
    const challenge = await challengeRepository.findOwned(user.id, challengeId);
    if (!challenge || challenge.status !== "COMPLETED") continue;
    if (challenge.days.length >= challenge.targetDays) continue;

    const windowOpen = isWithinWindow(formatDateOnly(challenge.startDate), challenge.durationDays, today);
    await challengeRepository.setStatus(challengeId, windowOpen ? "ACTIVE" : "ENDED", new Date());
    await revokeXp(user.id, "CHALLENGE_COMPLETION", challengeId);
  }
}
