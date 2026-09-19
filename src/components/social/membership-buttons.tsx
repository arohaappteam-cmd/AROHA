"use client";

import { CheckIcon, LoaderCircleIcon, PlusIcon } from "lucide-react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import {
  joinGroupChallengeAction,
  joinGuildAction,
  leaveGroupChallengeAction,
  leaveGuildAction,
} from "@/server/actions/social.actions";

/** Join or leave a guild. Leaving takes nothing away that was earned. */
export function GuildMembershipButton({ slug, joined, size = "sm" }: { slug: string; joined: boolean; size?: "sm" | "default" }) {
  const { pending, error, run } = useActionRunner();
  return (
    <div className="space-y-1">
      <Button
        size={size}
        variant={joined ? "outline" : "default"}
        disabled={pending}
        onClick={() => run(() => (joined ? leaveGuildAction(slug) : joinGuildAction(slug)))}
      >
        {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : joined ? <CheckIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
        {joined ? "Joined" : "Join guild"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Joining a group challenge starts the user's own challenge from the usual
 * template; leaving the group leaves that challenge running.
 */
export function GroupChallengeButton({ groupKey, joined }: { groupKey: string; joined: boolean }) {
  const { pending, error, run } = useActionRunner();
  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant={joined ? "outline" : "default"}
        disabled={pending}
        onClick={() => run(() => (joined ? leaveGroupChallengeAction(groupKey) : joinGroupChallengeAction(groupKey)))}
      >
        {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}
        {joined ? "Leave group" : "Join the group"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
