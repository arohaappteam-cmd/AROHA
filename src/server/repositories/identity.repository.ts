import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { LifeArea } from "@/generated/prisma/enums";
import type {
  AppearanceInput,
  PreferencesInput,
  ProfileInput,
} from "@/modules/identity/schemas";
import { db } from "@/server/db";

export const identityRepository = {
  /** The user's character, created with default appearance on first access. */
  async ensureCharacter(userId: string) {
    const existing = await db.character.findUnique({ where: { userId } });
    if (existing) return existing;
    try {
      return await db.character.create({ data: { userId } });
    } catch (error) {
      // Concurrent first requests (e.g. sidebar + page) may race to create it.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return db.character.findUniqueOrThrow({ where: { userId } });
      }
      throw error;
    }
  },

  updateProfile(userId: string, input: ProfileInput) {
    return db.user.update({
      where: { id: userId },
      data: { ...input, profileSavedAt: new Date() },
    });
  },

  updateAppearance(userId: string, input: AppearanceInput) {
    const data = {
      avatarStyle: input.style,
      avatarColor: input.color,
      avatarEmblem: input.emblem,
      motto: input.motto,
      customizedAt: new Date(),
    };
    return db.character.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  },

  listInterests(userId: string) {
    return db.userInterest.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  countInterests(userId: string) {
    return db.userInterest.count({ where: { userId } });
  },

  createInterest(
    userId: string,
    data: { label: string; slug: string; lifeArea: LifeArea | null },
  ) {
    return db.userInterest.create({ data: { userId, ...data } });
  },

  findInterestBySlug(userId: string, slug: string) {
    return db.userInterest.findUnique({
      where: { userId_slug: { userId, slug } },
    });
  },

  /** Scoped by user so one user can never delete another's interest. */
  deleteInterest(userId: string, interestId: string) {
    return db.userInterest.deleteMany({ where: { id: interestId, userId } });
  },

  listLifeAreas(userId: string) {
    return db.userLifeArea.findMany({ where: { userId } });
  },

  replaceLifeAreas(
    userId: string,
    areas: {
      lifeArea: LifeArea;
      isActive: boolean;
      isFocus: boolean;
      focusRank: number | null;
      intention: string | null;
    }[],
  ) {
    return db.$transaction(
      areas.map((area) =>
        db.userLifeArea.upsert({
          where: { userId_lifeArea: { userId, lifeArea: area.lifeArea } },
          update: area,
          create: { userId, ...area },
        }),
      ),
    );
  },

  findPreferences(userId: string) {
    return db.userPreferences.findUnique({ where: { userId } });
  },

  upsertPreferences(userId: string, input: PreferencesInput) {
    return db.userPreferences.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
    });
  },
};
