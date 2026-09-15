import { z } from "zod";

import { LifeArea, MilestoneStatus, StartingPoint } from "@/generated/prisma/enums";

import { GOAL_TRANSITIONS } from "./status";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters` })
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null);

const id = z.string().min(1).max(64);

export const goalInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Give your goal a name of at least 3 characters" })
    .max(100, { error: "Keep the name under 100 characters" }),
  lifeArea: z.enum(LifeArea, { error: "Choose a life area" }),
  motivation: optionalText(500),
  target: optionalText(200),
  description: optionalText(1000),
  startingPoint: z.enum(StartingPoint).default("NEW"),
  deadline: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null)
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), { error: "Use a valid date" })
    .refine(
      (value) => {
        if (value === null) return true;
        const date = new Date(`${value}T00:00:00.000Z`);
        const year = date.getUTCFullYear();
        return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) && year >= 2000 && year <= 2200;
      },
      { error: "Use a real date" },
    ),
});
export type GoalInput = z.infer<typeof goalInputSchema>;

export const createGoalSchema = goalInputSchema.extend({
  generateRoadmap: z.boolean().default(true),
});

export const goalTransitionSchema = z.object({
  goalId: id,
  transition: z.enum(GOAL_TRANSITIONS),
});

export const roadmapItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, { error: "Use at least 2 characters" })
    .max(120, { error: "Keep it under 120 characters" }),
  description: optionalText(500),
});
export type RoadmapItemInput = z.infer<typeof roadmapItemSchema>;

export const missionStatusSchema = z.enum([
  MilestoneStatus.PENDING,
  MilestoneStatus.COMPLETED,
  MilestoneStatus.SKIPPED,
]);

/** Milestones can only be set manually when they have no missions. */
export const milestoneManualStatusSchema = missionStatusSchema;

export const moveSchema = z.object({ id, direction: z.union([z.literal(-1), z.literal(1)]) });

export const idSchema = id;
