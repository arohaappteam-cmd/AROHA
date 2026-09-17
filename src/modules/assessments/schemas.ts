import { z } from "zod";

import { httpUrlSchema } from "@/modules/projects/schemas";

import { MIN_RESPONSE_LENGTH } from "./grading";
import { RUBRIC_MAX } from "./types";

const key = z.string().min(3).max(120);
const id = z.string().min(1).max(64);

export const quizSubmissionSchema = z.object({
  assessmentKey: key,
  answers: z.array(z.number().int().min(0).max(10)).max(30),
});

const ratingsSchema = z.record(z.string().min(1).max(40), z.number().int().min(0).max(RUBRIC_MAX));

const responseSchema = z
  .string()
  .trim()
  .min(MIN_RESPONSE_LENGTH, { error: `Tell the story in at least ${MIN_RESPONSE_LENGTH} characters — what you did and how` })
  .max(3000, { error: "Keep it under 3,000 characters" });

export const practicalSubmissionSchema = z.object({
  assessmentKey: key,
  response: responseSchema,
  evidenceUrl: httpUrlSchema.refine((value) => value !== null, { error: "Link to what you made — proof, not claims" }),
  ratings: ratingsSchema,
});
export type PracticalSubmission = z.infer<typeof practicalSubmissionSchema>;

export const projectAssessmentSubmissionSchema = z.object({
  assessmentKey: key,
  projectId: id,
  response: responseSchema,
  ratings: ratingsSchema,
});
export type ProjectAssessmentSubmission = z.infer<typeof projectAssessmentSubmissionSchema>;
