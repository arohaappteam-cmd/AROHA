"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validationFailure } from "@/lib/action-result";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { authErrorMessage, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, newPasswordSchema } from "@/modules/auth/schemas";

export function NewPasswordForm() {
  const router = useRouter();
  const { pending, error, run } = useActionRunner();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (mismatch) return;
        run(async () => {
          const parsed = newPasswordSchema.safeParse({ password });
          if (!parsed.success) return validationFailure(parsed.error);
          const { error: failure } = await supabaseBrowser().auth.updateUser({ password: parsed.data.password });
          if (failure) return { ok: false, error: authErrorMessage(failure.code, "Couldn't update your password. Open the reset link again and retry.") };
          router.replace("/");
          router.refresh();
          return { ok: true };
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Type it again</Label>
        <Input id="confirm" type="password" autoComplete="new-password" required value={confirm} aria-invalid={mismatch} onChange={(event) => setConfirm(event.target.value)} />
        {mismatch && <p className="text-xs text-destructive">The two passwords don&apos;t match.</p>}
      </div>
      <Button type="submit" className="w-full" disabled={pending || mismatch}>
        {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
        Save new password
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
