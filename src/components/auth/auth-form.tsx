"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validationFailure, type ActionResult } from "@/lib/action-result";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  authErrorMessage,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
} from "@/modules/auth/schemas";

type Mode = "sign-in" | "sign-up" | "reset";

const COPY: Record<Mode, { title: string; description: string; submit: string }> = {
  "sign-in": { title: "Welcome back", description: "Sign in to pick up today's journey.", submit: "Sign in" },
  "sign-up": { title: "Start your journey", description: "One account. Your goals, quests and record stay yours.", submit: "Create account" },
  reset: { title: "Reset your password", description: "We'll email you a link to choose a new one.", submit: "Send reset link" },
};

/** Sign in, create an account, or ask for a password reset — one card, three modes. */
export function AuthForm({ next, initialError }: { next: string; initialError: string | null }) {
  const router = useRouter();
  const { pending, error, setError, run } = useActionRunner();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [notice, setNotice] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const copy = COPY[mode];

  function switchTo(nextMode: Mode) {
    setMode(nextMode);
    setNotice(null);
    setError(null);
  }

  async function signIn(): Promise<ActionResult> {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return validationFailure(parsed.error);
    const { error: failure } = await supabaseBrowser().auth.signInWithPassword(parsed.data);
    if (failure) return { ok: false, error: authErrorMessage(failure.code, "Couldn't sign you in. Please try again.") };
    router.replace(next);
    router.refresh();
    return { ok: true };
  }

  async function signUp(): Promise<ActionResult> {
    const parsed = signUpSchema.safeParse({ displayName, email, password });
    if (!parsed.success) return validationFailure(parsed.error);
    const { data, error: failure } = await supabaseBrowser().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { display_name: parsed.data.displayName }, emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (failure) return { ok: false, error: authErrorMessage(failure.code, "Couldn't create your account. Please try again.") };
    // With email confirmation off, Supabase signs the person straight in.
    if (data.session) {
      router.replace("/");
      router.refresh();
      return { ok: true };
    }
    // Same answer whether or not the address was already registered, so the
    // form can't be used to find out who has an account.
    setNotice("Check your inbox — we've sent a link to confirm your email.");
    return { ok: true };
  }

  async function requestReset(): Promise<ActionResult> {
    const parsed = resetRequestSchema.safeParse({ email });
    if (!parsed.success) return validationFailure(parsed.error);
    const { error: failure } = await supabaseBrowser().auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    if (failure?.code === "over_email_send_rate_limit" || failure?.code === "over_request_rate_limit") {
      return { ok: false, error: authErrorMessage(failure.code, "") };
    }
    setNotice("If that email has an account, a reset link is on its way.");
    return { ok: true };
  }

  function submit() {
    setNotice(null);
    run(mode === "sign-in" ? signIn : mode === "sign-up" ? signUp : requestReset);
  }

  const shownError = error ?? (mode === "sign-in" ? initialError : null);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {mode === "sign-up" && (
          <div className="space-y-1.5">
            <Label htmlFor="displayName">What should we call you?</Label>
            <Input id="displayName" autoComplete="nickname" maxLength={60} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        {mode !== "reset" && (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              {mode === "sign-in" && (
                <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => switchTo("reset")}>
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              minLength={mode === "sign-up" ? MIN_PASSWORD_LENGTH : undefined}
              maxLength={MAX_PASSWORD_LENGTH}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "sign-up" && <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          {copy.submit}
        </Button>

        {shownError && (
          <p role="alert" className="text-sm text-destructive">
            {shownError}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            {notice}
          </p>
        )}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            New to AROHA?{" "}
            <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => switchTo("sign-up")}>
              Create an account
            </button>
          </>
        ) : (
          <>
            {mode === "sign-up" ? "Already have an account? " : "Remembered it? "}
            <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => switchTo("sign-in")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
