import "server-only";

import type { Attribute, LifeArea } from "@/generated/prisma/enums";
import {
  normalizeAttributeTotals,
  type AttributeTotal,
} from "@/modules/analytics/attribute-totals";
import { toAppearance, type AvatarAppearance } from "@/modules/identity/avatar";
import {
  focusAreas,
  resolveLifeAreas,
  type ResolvedLifeArea,
} from "@/modules/identity/life-areas";
import {
  DEFAULT_PREFERENCES,
  type Preferences,
} from "@/modules/identity/preferences";
import { getSetupState, type SetupState } from "@/modules/identity/setup";
import {
  getLevelProgress,
  tierForLevel,
  type LevelProgress,
  type TierTitle,
} from "@/modules/progression";
import { getCurrentUser } from "@/server/auth/current-user";
import { goalRepository } from "@/server/repositories/goal.repository";
import { identityRepository } from "@/server/repositories/identity.repository";
import { progressionRepository } from "@/server/repositories/progression.repository";

export type LifeAreaWithXp = ResolvedLifeArea & { xp: number };

export type CharacterSheet = {
  user: {
    id: string;
    displayName: string;
    pronouns: string | null;
    bio: string | null;
    timezone: string;
    memberSince: Date;
  };
  character: { motto: string | null; appearance: AvatarAppearance };
  progress: LevelProgress & { tier: TierTitle };
  attributes: AttributeTotal[];
  lifeAreas: LifeAreaWithXp[];
  focus: LifeAreaWithXp[];
  interests: { id: string; label: string; lifeArea: LifeArea | null }[];
  preferences: Preferences & { saved: boolean };
  record: {
    activeGoals: number;
    skills: number;
    achievements: number;
    questsCompleted: number;
  };
  /** Newest entries from the XP ledger — the auditable history. */
  recentXp: XpEntry[];
  setup: SetupState;
};

export type XpEntry = {
  id: string;
  amount: number;
  reason: string;
  lifeArea: LifeArea | null;
  sourceType: string;
  createdAt: Date;
  attributes: { attribute: Attribute; amount: number }[];
};

/** Everything the character dashboard and customize page need, in one read. */
export async function getCharacterSheet(): Promise<CharacterSheet> {
  const user = await getCurrentUser();

  const [
    character,
    interests,
    lifeAreaRows,
    preferencesRow,
    totalXp,
    attributeRows,
    xpByArea,
    activeGoals,
    skills,
    achievements,
    questsCompleted,
    recentXp,
  ] = await Promise.all([
    identityRepository.ensureCharacter(user.id),
    identityRepository.listInterests(user.id),
    identityRepository.listLifeAreas(user.id),
    identityRepository.findPreferences(user.id),
    progressionRepository.getTotalXp(user.id),
    progressionRepository.getAttributeTotals(user.id),
    progressionRepository.getXpByLifeArea(user.id),
    goalRepository.countActive(user.id),
    progressionRepository.countSkills(user.id),
    progressionRepository.countAchievements(user.id),
    progressionRepository.countCompletedQuests(user.id),
    progressionRepository.listRecentTransactions(user.id, 8),
  ]);

  const progress = getLevelProgress(totalXp);
  const lifeAreas = resolveLifeAreas(lifeAreaRows).map((area) => ({
    ...area,
    xp: xpByArea.get(area.key) ?? 0,
  }));
  const focus = focusAreas(lifeAreas);

  const preferences: CharacterSheet["preferences"] = preferencesRow
    ? {
        dailyMinutes: preferencesRow.dailyMinutes,
        preferredTimeOfDay: preferencesRow.preferredTimeOfDay,
        challengeLevel: preferencesRow.challengeLevel,
        movementOptions: preferencesRow.movementOptions,
        learningFormats: preferencesRow.learningFormats,
        saved: true,
      }
    : { ...DEFAULT_PREFERENCES, saved: false };

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      pronouns: user.pronouns,
      bio: user.bio,
      timezone: user.timezone,
      memberSince: user.createdAt,
    },
    character: {
      motto: character.motto,
      appearance: toAppearance(character),
    },
    progress: { ...progress, tier: tierForLevel(progress.level) },
    attributes: normalizeAttributeTotals(attributeRows),
    lifeAreas,
    focus,
    interests: interests.map(({ id, label, lifeArea }) => ({ id, label, lifeArea })),
    preferences,
    record: { activeGoals, skills, achievements, questsCompleted },
    recentXp: recentXp.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      reason: entry.reason,
      lifeArea: entry.lifeArea,
      sourceType: entry.sourceType,
      createdAt: entry.createdAt,
      attributes: entry.statTransactions,
    })),
    setup: getSetupState({
      profileSaved: user.profileSavedAt !== null,
      characterCustomized: character.customizedAt !== null,
      interestCount: interests.length,
      focusCount: focus.length,
      preferencesSaved: preferencesRow !== null,
    }),
  };
}
