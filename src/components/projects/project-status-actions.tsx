"use client";

import { CheckCheckIcon, LoaderCircleIcon, PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { canTransitionProject, completionBlocker, type ProjectTransition } from "@/modules/projects/status";
import { transitionProjectAction } from "@/server/actions/project.actions";

type Feedback = { ok: boolean; text: string };

export function ProjectStatusActions({
  projectId,
  status,
  evidenceCount,
  skillCount,
}: {
  projectId: string;
  status: ProjectStatus;
  evidenceCount: number;
  skillCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const can = (transition: ProjectTransition) => canTransitionProject(status, transition);
  const blocker = completionBlocker({ evidenceCount, skillCount });

  const run = (transition: ProjectTransition) =>
    startTransition(async () => {
      const result = await transitionProjectAction({ projectId, transition });
      setFeedback(result.ok ? { ok: true, text: result.message ?? "Done" } : { ok: false, text: result.error });
      setConfirmReopen(false);
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {can("start") && (
          <Button variant="outline" disabled={pending} onClick={() => run("start")}>
            <PlayIcon data-icon="inline-start" />
            Start building
          </Button>
        )}
        {can("resume") && (
          <Button variant="outline" disabled={pending} onClick={() => run("resume")}>
            <PlayIcon data-icon="inline-start" />
            Resume
          </Button>
        )}
        {can("complete") && (
          <Button disabled={pending || blocker !== null} onClick={() => run("complete")} title={blocker ?? undefined}>
            {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <CheckCheckIcon data-icon="inline-start" />}
            Mark complete
          </Button>
        )}
        {can("pause") && (
          <Button variant="ghost" disabled={pending} onClick={() => run("pause")}>
            <PauseIcon data-icon="inline-start" />
            Pause
          </Button>
        )}
        {can("reopen") &&
          (confirmReopen ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Reopening sets its completion XP aside until you finish again.
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run("reopen")}>
                Reopen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReopen(false)}>
                Keep it complete
              </Button>
            </span>
          ) : (
            <Button variant="ghost" disabled={pending} onClick={() => setConfirmReopen(true)}>
              <RotateCcwIcon data-icon="inline-start" />
              Reopen
            </Button>
          ))}
      </div>
      {can("complete") && blocker && <p className="text-xs text-muted-foreground">{blocker}</p>}
      {feedback && (
        <p role={feedback.ok ? "status" : "alert"} className={feedback.ok ? "text-sm text-emerald-600 dark:text-emerald-300" : "text-sm text-destructive"}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}
