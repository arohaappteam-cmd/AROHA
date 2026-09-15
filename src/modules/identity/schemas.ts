import { z } from "zod";

import {
  AvatarStyle,
  ChallengeLevel,
  LearningFormat,
  LifeArea,
  MovementOption,
  TimeOfDay,
} from "@/generated/prisma/enums";

import { AVATAR_COLOR_KEYS, AVATAR_EMBLEM_KEYS } from "./avatar";
import {
  MAX_INTEREST_LENGTH,
  MIN_INTEREST_LENGTH,
} from "./interests";
import { MAX_FOCUS_AREAS, MAX_INTENTION_LENGTH, LIFE_AREAS } from "./life-areas";
import { DAILY_MINUTE_OPTIONS } from "./preferences";
import { isValidTimezone } from "./timezones";

/** Empty strings from forms become null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters` })
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null);

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { error: "Your name is required" })
    .max(60, { error: "Keep it under 60 characters" }),
  pronouns: optionalText(30),
  bio: optionalText(500),
  timezone: z
    .string()
    .refine(isValidTimezone, { error: "Choose a valid timezone" }),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const appearanceSchema = z.object({
  style: z.enum(AvatarStyle),
  color: z.enum(AVATAR_COLOR_KEYS),
  emblem: z.enum(AVATAR_EMBLEM_KEYS),
  motto: optionalText(80),
});
export type AppearanceInput = z.infer<typeof appearanceSchema>;

export const interestSchema = z.object({
  label: z
    .string()
    .trim()
    .min(MIN_INTEREST_LENGTH, { error: "Interests need at least 2 characters" })
    .max(MAX_INTEREST_LENGTH, { error: `Keep it under ${MAX_INTEREST_LENGTH} characters` }),
  lifeArea: z.enum(LifeArea).nullable().default(null),
});
export type InterestInput = z.infer<typeof interestSchema>;

export const lifeAreasSchema = z
  .array(
    z.object({
      lifeArea: z.enum(LifeArea),
      isActive: z.boolean(),
      isFocus: z.boolean(),
      intention: optionalText(MAX_INTENTION_LENGTH),
    }),
  )
  .superRefine((areas, ctx) => {
    const seen = new Set<string>();
    for (const area of areas) {
      if (seen.has(area.lifeArea)) {
        ctx.addIssue({ code: "custom", message: `Duplicate life area ${area.lifeArea}` });
      }
      seen.add(area.lifeArea);
      if (area.isFocus && !area.isActive && !LIFE_AREAS[area.lifeArea].core) {
        ctx.addIssue({
          code: "custom",
          message: `${LIFE_AREAS[area.lifeArea].label} must be active to be a focus`,
        });
      }
    }
    const focusCount = areas.filter((area) => area.isFocus).length;
    if (focusCount > MAX_FOCUS_AREAS) {
      ctx.addIssue({
        code: "custom",
        message: `Choose at most ${MAX_FOCUS_AREAS} focus areas`,
      });
    }
  });
export type LifeAreasInput = z.infer<typeof lifeAreasSchema>;

export const preferencesSchema = z.object({
  dailyMinutes: z
    .number()
    .int()
    .refine((value) => (DAILY_MINUTE_OPTIONS as readonly number[]).includes(value), {
      error: "Choose one of the listed durations",
    }),
  preferredTimeOfDay: z.enum(TimeOfDay),
  challengeLevel: z.enum(ChallengeLevel),
  movementOptions: z.array(z.enum(MovementOption)).transform((v) => [...new Set(v)]),
  learningFormats: z.array(z.enum(LearningFormat)).transform((v) => [...new Set(v)]),
});
export type PreferencesInput = z.infer<typeof preferencesSchema>;
