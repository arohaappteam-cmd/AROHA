"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { validationFailure, type ActionResult } from "@/lib/action-result";
import { getCurrentUser, isAuthEnabled } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { AccountError, deleteAccount, DELETE_CONFIRMATION } from "@/server/services/account.service";

const confirmSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION, { error: `Type ${DELETE_CONFIRMATION} to confirm` }),
});

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await deleteAccount(await getCurrentUser());
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AccountError) return { ok: false, error: error.message };
    console.error("[account] deletion failed", error);
    return { ok: false, error: "Something went wrong. Nothing was deleted — please try again." };
  }

  if (isAuthEnabled()) {
    // The sign-in is gone; clear this browser's session cookies too.
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // A session for a deleted sign-in can't be used again either way.
    }
    redirect("/login?deleted=1");
  }
  redirect("/");
}
