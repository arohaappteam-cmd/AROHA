import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { getCurrentUser, isAuthEnabled } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from a password-reset email, which signs the person in first. */
export default async function ResetPasswordPage() {
  await connection();
  if (!isAuthEnabled()) redirect("/");
  await getCurrentUser();

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">You&apos;re signed in from the email link. Pick something you haven&apos;t used here before.</p>
        </div>
        <NewPasswordForm />
      </div>
    </AuthShell>
  );
}
