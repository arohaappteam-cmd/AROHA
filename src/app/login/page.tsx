import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isAuthEnabled } from "@/server/auth/current-user";
import { safeNext } from "@/server/auth/redirects";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or ask for a new one.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  // Without accounts there is nothing to sign in to.
  if (!isAuthEnabled()) redirect("/");

  const params = await props.searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? (ERRORS[params.error] ?? null) : null;

  return (
    <AuthShell>
      {params.deleted === "1" && (
        <p role="status" className="mb-6 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          Your account and everything in it has been deleted.
        </p>
      )}
      <AuthForm next={next} initialError={error} />
    </AuthShell>
  );
}
