"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/server/auth/current-user";
import { setPlanInterest } from "@/server/services/plan.service";

// Server Functions receive untrusted input: everything is re-parsed here.
const interestSchema = z.object({ tier: z.enum(["PRO", "PREMIUM"]), interested: z.boolean() });

/** "Notify me" for a paid tier. Nothing is charged — payments aren't live. */
export async function setPlanInterestAction(input: unknown): Promise<ActionResult> {
  const parsed = interestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That plan doesn't exist" };
  try {
    const user = await getCurrentUser();
    await setPlanInterest(user.id, parsed.data.tier, parsed.data.interested);
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  revalidatePath("/plans");
  return {
    ok: true,
    message: parsed.data.interested ? "You're on the list — we'll let you know when it launches." : "Removed from the list.",
  };
}
