import { LogOutIcon } from "lucide-react";

import { signOutAction } from "@/server/actions/auth.actions";

/** A plain form, so signing out works before any JavaScript has loaded. */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
      >
        <LogOutIcon className="size-4 shrink-0" aria-hidden />
        Sign out
      </button>
    </form>
  );
}
