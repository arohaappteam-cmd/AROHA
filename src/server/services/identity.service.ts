import "server-only";

import {
  cleanInterestLabel,
  interestSlug,
  MAX_INTERESTS,
} from "@/modules/identity/interests";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import type {
  AppearanceInput,
  InterestInput,
  LifeAreasInput,
  PreferencesInput,
  ProfileInput,
} from "@/modules/identity/schemas";
import { identityRepository } from "@/server/repositories/identity.repository";

/** Business errors that are safe to show to the user. */
export class IdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityError";
  }
}

export async function updateProfile(userId: string, input: ProfileInput) {
  await identityRepository.updateProfile(userId, input);
}

export async function updateAppearance(userId: string, input: AppearanceInput) {
  await identityRepository.updateAppearance(userId, input);
}

export async function addInterest(userId: string, input: InterestInput) {
  const label = cleanInterestLabel(input.label);
  const slug = interestSlug(label);
  if (!slug) throw new IdentityError("Interests need at least one letter or number");

  const existing = await identityRepository.findInterestBySlug(userId, slug);
  if (existing) return existing;

  const count = await identityRepository.countInterests(userId);
  if (count >= MAX_INTERESTS) {
    throw new IdentityError(
      `You can keep up to ${MAX_INTERESTS} interests. Remove one to add another.`,
    );
  }

  return identityRepository.createInterest(userId, {
    label,
    slug,
    lifeArea: input.lifeArea,
  });
}

export async function removeInterest(userId: string, interestId: string) {
  await identityRepository.deleteInterest(userId, interestId);
}

/**
 * Saves every submitted life area. Core areas are forced active, and focus
 * rank follows the order focus areas appear in the submission.
 */
export async function saveLifeAreas(userId: string, input: LifeAreasInput) {
  let rank = 0;
  const rows = input.map((area) => {
    const isActive = LIFE_AREAS[area.lifeArea].core || area.isActive;
    const isFocus = isActive && area.isFocus;
    return {
      lifeArea: area.lifeArea,
      isActive,
      isFocus,
      focusRank: isFocus ? ++rank : null,
      intention: area.intention,
    };
  });
  await identityRepository.replaceLifeAreas(userId, rows);
}

export async function savePreferences(userId: string, input: PreferencesInput) {
  await identityRepository.upsertPreferences(userId, input);
}
