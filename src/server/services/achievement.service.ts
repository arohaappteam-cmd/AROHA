import "server-only";

import {
  ACHIEVEMENTS,
  earnedAchievements,
  type AchievementFacts,
  type UnlockedAchievement,
} from "@/modules/achievements/catalogue";
import { skillLevelForXp } from "@/modules/skills/levels";
import { db } from "@/server/db";
import { syncAchievementCatalogue } from "@/server/db/achievement-sync";
import { awardXp } from "@/server/progression/engine";
import { achievementRepository } from "@/server/repositories/achievement.repository";
import { skillRepository } from "@/server/repositories/skill.repository";

/**
 * Achievements (spec §17). Unlocks are checked by deterministic backend
 * rules over real counts — never granted by hand or by AI — and once earned
 * they are part of the user's history: nothing revokes them, even if the
 * action behind them is later undone. XP for an achievement is area-neutral
 * (no stat gains) and idempotent like every award.
 */

let catalogueReady: Promise<void> | null = null;

/** Syncs the catalogue once per server process; safe to await anywhere. */
export function ensureAchievementCatalogue(): Promise<void> {
  catalogueReady ??= syncAchievementCatalogue(db).catch((error) => {
    catalogueReady = null;
    throw error;
  });
  return catalogueReady;
}

/** Gathers every fact the rules are allowed to see. All backend-derived. */
export async function gatherFacts(userId: string): Promise<AchievementFacts> {
  const [
    questsCompleted,
    projectsCompleted,
    abilityDemonstrated,
    readingQuestsCompleted,
    goalsCompleted,
    longestChallengeCompleted,
    skills,
    verified,
    experimentsReviewed,
    reflectionDays,
  ] = await Promise.all([
    achievementRepository.countQuestCompletions(userId),
    achievementRepository.countCompletedProjects(userId),
    achievementRepository.abilityDemonstrated(userId),
    achievementRepository.countReadingCompletions(userId),
    achievementRepository.countCompletedGoals(userId),
    achievementRepository.longestCompletedChallenge(userId),
    achievementRepository.skillLevelInputs(userId),
    skillRepository.abilityVerifiedSkillIds(userId),
    achievementRepository.countReviewedExperiments(userId),
    achievementRepository.countReflectionDays(userId),
  ]);

  const levels = skills.map((skill) => ({
    skillId: skill.skillId,
    level: skillLevelForXp(skill.baseXp, skill.maxLevel, skill.xp),
    maxLevel: skill.maxLevel,
  }));
  return {
    questsCompleted,
    projectsCompleted,
    abilityDemonstrated,
    readingQuestsCompleted,
    goalsCompleted,
    longestChallengeCompleted,
    maxSkillLevel: levels.reduce((max, skill) => Math.max(max, skill.level), 0),
    // Mastery needs proof, never XP alone.
    hasMasteredSkill: levels.some((skill) => skill.level >= skill.maxLevel && verified.has(skill.skillId)),
    experimentsReviewed,
    reflectionDays,
  };
}

/**
 * Evaluates every rule and unlocks whatever is newly earned. Idempotent and
 * safe to call after any progress event; returns only the fresh unlocks.
 */
export async function checkAchievements(userId: string): Promise<UnlockedAchievement[]> {
  await ensureAchievementCatalogue();

  const [facts, existing] = await Promise.all([gatherFacts(userId), achievementRepository.listUnlocked(userId)]);
  const unlockedSlugs = new Set(existing.map((entry) => entry.achievement.slug));
  const fresh = earnedAchievements(facts).filter((spec) => !unlockedSlugs.has(spec.slug));

  const unlocked: UnlockedAchievement[] = [];
  for (const spec of fresh) {
    const achievement = await achievementRepository.findBySlug(spec.slug);
    if (!achievement) continue;
    const created = await achievementRepository.unlock(userId, achievement.id);
    if (!created) continue; // raced with another request — already celebrated there

    if (achievement.xpReward > 0) {
      await awardXp({
        userId,
        amount: achievement.xpReward,
        sourceType: "ACHIEVEMENT",
        // One award per user per achievement, ever. The ledger's source key is
        // global, so it must carry the user — the achievement id alone is shared.
        sourceId: `${userId}:${achievement.id}`,
        lifeArea: null,
        reason: `Achievement: ${achievement.name}`,
      });
    }
    unlocked.push({ slug: spec.slug, name: spec.name, emoji: spec.emoji, xpReward: achievement.xpReward });
  }
  return unlocked;
}

export type AchievementView = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  hint: string;
  xpReward: number;
  unlockedAt: Date | null;
};

/** The full catalogue with the user's unlock dates, for the Journey page. */
export async function getAchievementsView(userId: string): Promise<AchievementView[]> {
  await ensureAchievementCatalogue();
  const unlocked = await achievementRepository.listUnlocked(userId);
  const dates = new Map(unlocked.map((entry) => [entry.achievement.slug, entry.unlockedAt]));

  return ACHIEVEMENTS.map((spec) => ({
    slug: spec.slug,
    name: spec.name,
    description: spec.description,
    emoji: spec.emoji,
    hint: spec.hint,
    xpReward: spec.xpReward,
    unlockedAt: dates.get(spec.slug) ?? null,
  }));
}
