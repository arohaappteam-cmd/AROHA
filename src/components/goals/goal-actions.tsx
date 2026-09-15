"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CheckIcon,
  CrownIcon,
  EllipsisIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GoalStatus } from "@/generated/prisma/enums";
import type { GoalTransition } from "@/modules/goals/status";
import {
  setGoalArchivedAction,
  setMajorGoalAction,
  transitionGoalAction,
} from "@/server/actions/goal.actions";

import { useActionRunner } from "./use-action-runner";

type Confirm = "complete" | "archive" | null;

export function GoalActions({
  goal,
}: {
  goal: {
    id: string;
    title: string;
    status: GoalStatus;
    archived: boolean;
    isMajor: boolean;
    remainingMissions: number;
  };
}) {
  const router = useRouter();
  const { pending, error, run } = useActionRunner();
  const [confirm, setConfirm] = useState<Confirm>(null);

  const transition = (t: GoalTransition) =>
    run(() => transitionGoalAction({ goalId: goal.id, transition: t }), () => setConfirm(null));

  if (goal.archived) {
    return (
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Button variant="outline" disabled={pending} onClick={() => run(() => setGoalArchivedAction(goal.id, false))}>
          <ArchiveRestoreIcon data-icon="inline-start" />
          Restore goal
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {goal.status === "COMPLETED" ? (
          <Button variant="outline" disabled={pending} onClick={() => transition("reopen")}>
            <RotateCcwIcon data-icon="inline-start" />
            Reopen
          </Button>
        ) : (
          <>
            {goal.status === "ACTIVE" ? (
              <Button variant="outline" disabled={pending} onClick={() => transition("pause")}>
                <PauseIcon data-icon="inline-start" />
                Pause
              </Button>
            ) : (
              <Button variant="outline" disabled={pending} onClick={() => transition("resume")}>
                <PlayIcon data-icon="inline-start" />
                Resume
              </Button>
            )}
            <Button disabled={pending} onClick={() => setConfirm("complete")}>
              <CheckIcon data-icon="inline-start" />
              Complete
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More goal actions" />}>
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push(`/goals/${goal.id}/edit`)}>
              <PencilIcon />
              Edit goal
            </DropdownMenuItem>
            {goal.status === "ACTIVE" && !goal.isMajor && (
              <DropdownMenuItem onClick={() => run(() => setMajorGoalAction(goal.id))}>
                <CrownIcon />
                Make major goal
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setConfirm("archive")}>
              <ArchiveIcon />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm === "complete" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark “{goal.title}” complete?</AlertDialogTitle>
                <AlertDialogDescription>
                  {goal.remainingMissions > 0
                    ? `${goal.remainingMissions} mission${goal.remainingMissions === 1 ? " is" : "s are"} still open. That's fine if you've reached what mattered — you can reopen the goal any time.`
                    : "Every mission is done. Take a moment — you did this."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Not yet</AlertDialogCancel>
                <Button disabled={pending} onClick={() => transition("complete")}>
                  Complete goal
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive “{goal.title}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  It moves out of your goals list and becomes read-only. Nothing is deleted, and you can restore it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => run(() => setGoalArchivedAction(goal.id, true), () => setConfirm(null))}
                >
                  Archive goal
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function EditGoalLink({ goalId }: { goalId: string }) {
  return (
    <Link href={`/goals/${goalId}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <PencilIcon data-icon="inline-start" />
      Edit
    </Link>
  );
}
