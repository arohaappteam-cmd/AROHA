"use client";

import { LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction } from "@/server/actions/account.actions";

const CONFIRMATION = "DELETE";

/** Permanent account deletion, behind a typed confirmation. */
export function DeleteAccount({ hasSignIn }: { hasSignIn: boolean }) {
  const { pending, error, run } = useActionRunner();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="border-destructive/50 text-destructive hover:bg-destructive/10">
        Delete my account…
      </Button>
    );
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-destructive/50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => deleteAccountAction({ confirmation: typed }));
      }}
    >
      <p className="flex items-start gap-2 text-sm">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <span>
          This permanently deletes your character, journal, reflections, goals, quests, XP, skills, projects, achievements and community
          activity{hasSignIn ? ", and your sign-in" : ""}. It can&apos;t be undone.
        </span>
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="delete-confirmation">
          Type <span className="font-mono font-semibold">{CONFIRMATION}</span> to confirm
        </Label>
        <Input id="delete-confirmation" autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} className="max-w-xs" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={pending || typed !== CONFIRMATION}>
          {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
          Delete everything
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
