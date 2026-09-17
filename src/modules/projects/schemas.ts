import { z } from "zod";

import { EvidenceKind, ProjectCategory } from "@/generated/prisma/enums";

import { MAX_PROJECT_SKILLS, PROJECT_TRANSITIONS } from "./status";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters` })
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null);

export const idSchema = z.string().min(1).max(64);

const skillIds = z
  .array(idSchema)
  .max(MAX_PROJECT_SKILLS, { error: `Pick up to ${MAX_PROJECT_SKILLS} skills — the ones this project really uses` })
  .default([])
  .transform((ids) => [...new Set(ids)]);

export const projectInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Give the project a name of at least 3 characters" })
    .max(100, { error: "Keep the name under 100 characters" }),
  description: optionalText(1000),
  category: z.enum(ProjectCategory, { error: "Choose a category" }),
  skillIds,
  reflection: optionalText(1500),
  /** Initial milestones; only used when creating. */
  milestones: z.array(z.string().trim().min(2).max(120)).max(10).default([]),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectTransitionSchema = z.object({
  projectId: idSchema,
  transition: z.enum(PROJECT_TRANSITIONS),
});

export const projectMilestoneSchema = z.object({
  projectId: idSchema,
  title: z
    .string()
    .trim()
    .min(2, { error: "Use at least 2 characters" })
    .max(120, { error: "Keep it under 120 characters" }),
});

export const httpUrlSchema = z
  .string()
  .trim()
  .max(500, { error: "Keep the link under 500 characters" })
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null)
  .refine((value) => value === null || /^https?:\/\/\S+$/i.test(value), {
    error: "Use a full link starting with http:// or https://",
  });

export const evidenceInputSchema = z
  .object({
    projectId: idSchema,
    kind: z.enum(EvidenceKind),
    title: z
      .string()
      .trim()
      .min(2, { error: "Name the evidence" })
      .max(120, { error: "Keep it under 120 characters" }),
    url: httpUrlSchema,
    note: optionalText(1000),
  })
  .refine((value) => value.url !== null || (value.kind === "NOTE" && value.note !== null), {
    error: "Add a link — or choose “Written note” and describe what you made",
    path: ["url"],
  });
export type EvidenceInput = z.infer<typeof evidenceInputSchema>;
