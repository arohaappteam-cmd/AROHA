"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addProjectMilestoneAction,
  deleteProjectMilestoneAction,
  setProjectMilestoneDoneAction,
} from "@/server/actions/project.actions";

type Milestone = { id: string; title: string; completedAt: Date | null };

export function ProjectMilestones({ projectId, milestones, locked }: { projectId: string; milestones: Milestone[]; locked: boolean }) {
  const { pending, error, run } = useActionRunner();
  const [title, setTitle] = useState("");
  const done = milestones.filter((milestone) => milestone.completedAt).length;

  return (
    <div className="space-y-3">
      {milestones.length > 0 && (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(done / milestones.length) * 100}%` }} />
          </div>
          <ul className="space-y-1">
            {milestones.map((milestone) => {
              const complete = milestone.completedAt !== null;
              return (
                <li key={milestone.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={complete}
                    disabled={pending || locked}
                    onChange={(event) => run(() => setProjectMilestoneDoneAction(milestone.id, event.target.checked))}
                    className="size-4 accent-[var(--primary)]"
                    aria-label={`Mark “${milestone.title}” ${complete ? "not done" : "done"}`}
                  />
                  <span className={cn("flex-1 text-sm", complete && "text-muted-foreground line-through")}>{milestone.title}</span>
                  {!locked && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => deleteProjectMilestoneAction(milestone.id))}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                      aria-label={`Remove “${milestone.title}”`}
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {milestones.length === 0 && <p className="text-sm text-muted-foreground">No milestones yet. Break the project into a few finishable steps.</p>}

      {!locked && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => addProjectMilestoneAction({ projectId, title }), () => setTitle(""));
          }}
        >
          <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Add a milestone" />
          <Button type="submit" variant="outline" disabled={pending || title.trim().length < 2}>
            <PlusIcon data-icon="inline-start" />
            Add
          </Button>
        </form>
      )}
      {locked && <p className="text-xs text-muted-foreground">Milestones are locked while the project is complete.</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
