import { z } from "zod";

/** Input contracts for the community actions. Server Actions re-parse everything. */

export const guildSlugSchema = z.string().trim().min(1).max(40);
export const groupKeySchema = z.string().trim().min(1).max(60);
export const handleSchema = z.string().trim().min(1).max(40);

export const MAX_HEADLINE_LENGTH = 120;
export const MAX_MENTORSHIP_MESSAGE = 400;

export const socialProfileSchema = z.object({
  visibility: z.enum(["PRIVATE", "COMMUNITY"]),
  headline: z.string().trim().max(MAX_HEADLINE_LENGTH).nullable().default(null),
  showLevel: z.boolean(),
  showSkills: z.boolean(),
  showAchievements: z.boolean(),
  onLeaderboards: z.boolean(),
  openToMentoring: z.boolean(),
  seekingMentor: z.boolean(),
});
export type SocialProfileInput = z.infer<typeof socialProfileSchema>;

export const mentorshipRequestSchema = z.object({
  handle: handleSchema,
  role: z.enum(["MENTEE", "MENTOR"]),
  topic: z.string().trim().min(1, "Say what it's about").max(80),
  message: z.string().trim().max(MAX_MENTORSHIP_MESSAGE).nullable().default(null),
});
export type MentorshipRequestInput = z.infer<typeof mentorshipRequestSchema>;
