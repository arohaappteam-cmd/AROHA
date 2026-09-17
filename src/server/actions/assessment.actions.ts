"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validationFailure, type ActionResult } from "@/lib/action-result";
import {
  practicalSubmissionSchema,
  projectAssessmentSubmissionSchema,
  quizSubmissionSchema,
} from "@/modules/assessments/schemas";
import { getCurrentUser } from "@/server/auth/current-user";
import * as assessments from "@/server/services/assessment.service";

// Server Functions receive untrusted input: everything is re-parsed here, and
// scores are always computed on the server — never taken from the client.

async function submit(task: (userId: string) => Promise<assessments.SubmissionOutcome>): Promise<ActionResult> {
  let attemptId: string;
  try {
    const user = await getCurrentUser();
    attemptId = (await task(user.id)).attemptId;
  } catch (error) {
    if (error instanceof assessments.AssessmentError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect(`/assessments/attempts/${attemptId}`);
}

export async function submitQuizAction(input: unknown): Promise<ActionResult> {
  const parsed = quizSubmissionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return submit((userId) => assessments.submitQuiz(userId, parsed.data));
}

export async function submitPracticalAction(input: unknown): Promise<ActionResult> {
  const parsed = practicalSubmissionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return submit((userId) => assessments.submitPractical(userId, parsed.data));
}

export async function submitProjectAssessmentAction(input: unknown): Promise<ActionResult> {
  const parsed = projectAssessmentSubmissionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return submit((userId) => assessments.submitProjectAssessment(userId, parsed.data));
}
