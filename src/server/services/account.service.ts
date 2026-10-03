import "server-only";

import type { User } from "@/generated/prisma/client";
import { isAuthEnabled } from "@/server/auth/current-user";
import { canDeleteSignIns, deleteSignIn } from "@/server/auth/supabase-admin";
import { db } from "@/server/db";

export class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountError";
  }
}

/** What the person types to confirm. Deliberate, not a reflex click. */
export const DELETE_CONFIRMATION = "DELETE";

type AccountUser = Pick<User, "id" | "authId">;

export type DeletionDeps = {
  authEnabled: () => boolean;
  canDeleteSignIns: () => boolean;
  deleteSignIn: (authId: string) => Promise<void>;
};

const liveDeps: DeletionDeps = { authEnabled: isAuthEnabled, canDeleteSignIns, deleteSignIn };

/**
 * Deletes an account for good: every record AROHA holds about the person
 * (journal, reflections, goals, quests, XP, community, mentorship notes —
 * all of it cascades from the user row), then their sign-in.
 *
 * Data goes first because it's the sensitive part. If removing the sign-in
 * then fails, signing in again finds a fresh, empty account, and deleting
 * again finishes the job — so a retry is always safe.
 */
export async function deleteAccount(user: AccountUser, deps: DeletionDeps = liveDeps): Promise<void> {
  const removesSignIn = deps.authEnabled() && user.authId !== null;
  if (removesSignIn && !deps.canDeleteSignIns()) {
    // Refuse rather than half-delete: the person would believe their sign-in was gone.
    throw new AccountError("Account deletion isn't switched on for this site yet. Please contact the site owner.");
  }

  await db.user.deleteMany({ where: { id: user.id } });

  if (removesSignIn) {
    try {
      await deps.deleteSignIn(user.authId!);
    } catch (error) {
      console.error("[account] sign-in removal failed after data deletion", error);
      throw new AccountError("Your data is deleted, but your sign-in couldn't be closed. Please try deleting again in a minute.");
    }
  }
}
