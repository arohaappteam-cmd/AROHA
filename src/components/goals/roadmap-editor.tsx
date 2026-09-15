"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleDashedIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SkipForwardIcon,
  SparklesIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { EmptyState } from "@/components/common/empty-state";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ContentSource, MilestoneStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { MAX_MILESTONES, MAX_MISSIONS_PER_MILESTONE } from "@/modules/goals/roadmap";
import {
  addMilestoneAction,
  addMissionAction,
  deleteMilestoneAction,
  deleteMissionAction,
  generateRoadmapAction,
  moveMilestoneAction,
  moveMissionAction,
  setMilestoneStatusAction,
  setMissionStatusAction,
  updateMilestoneAction,
  updateMissionAction,
} from "@/server/actions/goal.actions";
import type { RoadmapMilestone, RoadmapMission } from "@/server/services/goal-view.service";

import { RoadmapItemDialog } from "./roadmap-item-dialog";
import { useActionRunner } from "./use-action-runner";

type DialogState =
  | { kind: "add-milestone" }
  | { kind: "edit-milestone"; milestone: RoadmapMilestone }
  | { kind: "add-mission"; milestone: RoadmapMilestone }
  | { kind: "edit-mission"; mission: RoadmapMission }
  | null;

type ConfirmState =
  | { kind: "delete-milestone"; milestone: RoadmapMilestone }
  | { kind: "delete-mission"; mission: RoadmapMission }
  | { kind: "replace" }
  | null;

type OptimisticChange = { missionId: string; status: MilestoneStatus };

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  PENDING: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
};

function SourceHint({ source }: { source: ContentSource }) {
  if (source === "USER") return null;
  return (
    <span
      title={source === "AI" ? "Suggested by the AI Mentor" : "Suggested by a starter template"}
      className="inline-flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground uppercase"
    >
      <SparklesIcon className="size-2.5" aria-hidden />
      {source === "AI" ? "Mentor" : "Suggested"}
    </span>
  );
}

export function RoadmapEditor({
  goalId,
  roadmap,
  readOnly,
}: {
  goalId: string;
  roadmap: RoadmapMilestone[];
  readOnly: boolean;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const { pending, error, run } = useActionRunner();
  const [, startStatusTransition] = useTransition();

  const [milestones, applyStatus] = useOptimistic(roadmap, (state, change: OptimisticChange) =>
    state.map((milestone) => ({
      ...milestone,
      missions: milestone.missions.map((mission) =>
        mission.id === change.missionId ? { ...mission, status: change.status } : mission,
      ),
    })),
  );

  const open = (next: DialogState) => {
    setDialogKey((k) => k + 1);
    setDialog(next);
  };

  function setMissionStatus(mission: RoadmapMission, status: MilestoneStatus) {
    startStatusTransition(async () => {
      applyStatus({ missionId: mission.id, status });
      const result = await setMissionStatusAction(mission.id, status);
      if (!result.ok) run(async () => result);
    });
  }

  const currentIndex = milestones.findIndex((m) => m.status !== "COMPLETED" && m.status !== "SKIPPED");

  if (milestones.length === 0) {
    return (
      <>
        <EmptyState
          icon={WandSparklesIcon}
          title="No roadmap yet"
          description="Break this goal into milestones and missions — the steps between today and done."
          action={
            readOnly ? undefined : (
              <div className="flex flex-wrap justify-center gap-2">
                <Button disabled={pending} onClick={() => run(() => generateRoadmapAction(goalId, false))}>
                  <WandSparklesIcon data-icon="inline-start" />
                  {pending ? "Generating…" : "Suggest a roadmap"}
                </Button>
                <Button variant="outline" onClick={() => open({ kind: "add-milestone" })}>
                  <PlusIcon data-icon="inline-start" />
                  Build it myself
                </Button>
              </div>
            )
          }
        />
        {error && <p role="alert" className="mt-3 text-center text-sm text-destructive">{error}</p>}
        {renderDialogs()}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={milestones.length >= MAX_MILESTONES}
            onClick={() => open({ kind: "add-milestone" })}
          >
            <PlusIcon data-icon="inline-start" />
            Add milestone
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Roadmap options" />}>
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={() => setConfirm({ kind: "replace" })}>
                <WandSparklesIcon />
                Replace with a suggested roadmap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <ol className="relative space-y-4">
        {milestones.map((milestone, index) => (
          <MilestoneItem
            key={milestone.id}
            milestone={milestone}
            index={index}
            isFirst={index === 0}
            isLast={index === milestones.length - 1}
            isCurrent={index === currentIndex}
            readOnly={readOnly}
            busy={pending}
            onEdit={() => open({ kind: "edit-milestone", milestone })}
            onDelete={() => setConfirm({ kind: "delete-milestone", milestone })}
            onMove={(direction) => run(() => moveMilestoneAction({ id: milestone.id, direction }))}
            onSetStatus={(status) => run(() => setMilestoneStatusAction(milestone.id, status))}
            onAddMission={(title) => addMissionAction(milestone.id, { title, description: "" })}
            onEditMission={(mission) => open({ kind: "edit-mission", mission })}
            onDeleteMission={(mission) => setConfirm({ kind: "delete-mission", mission })}
            onMoveMission={(mission, direction) => run(() => moveMissionAction({ id: mission.id, direction }))}
            onMissionStatus={setMissionStatus}
          />
        ))}
      </ol>

      {renderDialogs()}
    </div>
  );

  function renderDialogs() {
    return (
      <>
        {dialog?.kind === "add-milestone" && (
          <RoadmapItemDialog
            key={dialogKey}
            open
            onOpenChange={(o) => !o && setDialog(null)}
            title="Add a milestone"
            description="A meaningful stage on the way to your goal."
            submitLabel="Add milestone"
            onSubmit={(values) => addMilestoneAction(goalId, values)}
          />
        )}
        {dialog?.kind === "edit-milestone" && (
          <RoadmapItemDialog
            key={dialogKey}
            open
            onOpenChange={(o) => !o && setDialog(null)}
            title="Edit milestone"
            description="Rename it or add details."
            submitLabel="Save"
            initial={dialog.milestone}
            onSubmit={(values) => updateMilestoneAction(dialog.milestone.id, values)}
          />
        )}
        {dialog?.kind === "add-mission" && (
          <RoadmapItemDialog
            key={dialogKey}
            open
            onOpenChange={(o) => !o && setDialog(null)}
            title={`Add a mission to “${dialog.milestone.title}”`}
            description="A concrete objective you can actually finish."
            submitLabel="Add mission"
            onSubmit={(values) => addMissionAction(dialog.milestone.id, values)}
          />
        )}
        {dialog?.kind === "edit-mission" && (
          <RoadmapItemDialog
            key={dialogKey}
            open
            onOpenChange={(o) => !o && setDialog(null)}
            title="Edit mission"
            description="Make it clearer or more achievable."
            submitLabel="Save"
            initial={dialog.mission}
            onSubmit={(values) => updateMissionAction(dialog.mission.id, values)}
          />
        )}

        <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirm?.kind === "replace"
                  ? "Replace your roadmap?"
                  : confirm?.kind === "delete-milestone"
                    ? `Delete “${confirm.milestone.title}”?`
                    : confirm?.kind === "delete-mission"
                      ? `Delete “${confirm.mission.title}”?`
                      : ""}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirm?.kind === "replace"
                  ? "Your current milestones, missions and their progress will be removed and replaced with a fresh suggestion."
                  : confirm?.kind === "delete-milestone"
                    ? `This also deletes its ${confirm.milestone.missions.length} mission${confirm.milestone.missions.length === 1 ? "" : "s"}. This can't be undone.`
                    : "This can't be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  if (!confirm) return;
                  const done = () => setConfirm(null);
                  if (confirm.kind === "replace") run(() => generateRoadmapAction(goalId, true), done);
                  else if (confirm.kind === "delete-milestone") run(() => deleteMilestoneAction(confirm.milestone.id), done);
                  else run(() => deleteMissionAction(confirm.mission.id), done);
                }}
              >
                {confirm?.kind === "replace" ? "Replace roadmap" : "Delete"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
}

function MilestoneNode({ status, index, isCurrent }: { status: MilestoneStatus; index: number; isCurrent: boolean }) {
  return (
    <span
      className={cn(
        "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 bg-card text-sm font-semibold tabular-nums",
        status === "COMPLETED" && "border-primary bg-primary text-primary-foreground",
        status === "IN_PROGRESS" && "border-primary text-primary",
        status === "SKIPPED" && "border-dashed border-muted-foreground/40 text-muted-foreground",
        status === "PENDING" && (isCurrent ? "border-primary/60 text-foreground" : "border-border text-muted-foreground"),
      )}
      aria-hidden
    >
      {status === "COMPLETED" ? <CheckIcon className="size-4" /> : status === "SKIPPED" ? <SkipForwardIcon className="size-3.5" /> : index + 1}
    </span>
  );
}

function MilestoneItem({
  milestone,
  index,
  isFirst,
  isLast,
  isCurrent,
  readOnly,
  busy,
  onEdit,
  onDelete,
  onMove,
  onSetStatus,
  onAddMission,
  onEditMission,
  onDeleteMission,
  onMoveMission,
  onMissionStatus,
}: {
  milestone: RoadmapMilestone;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
  readOnly: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onSetStatus: (status: MilestoneStatus) => void;
  onAddMission: (title: string) => Promise<{ ok: boolean; error?: string }>;
  onEditMission: (mission: RoadmapMission) => void;
  onDeleteMission: (mission: RoadmapMission) => void;
  onMoveMission: (mission: RoadmapMission, direction: -1 | 1) => void;
  onMissionStatus: (mission: RoadmapMission, status: MilestoneStatus) => void;
}) {
  const done = milestone.status === "COMPLETED" || milestone.status === "SKIPPED";
  const [expanded, setExpanded] = useState(!done);
  const [draft, setDraft] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();
  const completed = milestone.missions.filter((m) => m.status === "COMPLETED").length;
  const countable = milestone.missions.filter((m) => m.status !== "SKIPPED").length;
  const hasMissions = milestone.missions.length > 0;

  function addMission() {
    const title = draft.trim();
    if (title.length < 2) return;
    setAddError(null);
    startAdding(async () => {
      const result = await onAddMission(title);
      if (result.ok) setDraft("");
      else setAddError(result.error ?? "Couldn't add mission");
    });
  }

  return (
    <li className="relative flex gap-4">
      {!isLast && <span aria-hidden className="absolute top-9 bottom-[-1rem] left-[1.0625rem] w-0.5 bg-border" />}
      <MilestoneNode status={milestone.status} index={index} isCurrent={isCurrent} />

      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border bg-card",
          isCurrent && "border-primary/40 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_15%,transparent)]",
        )}
      >
        <div className="flex items-start gap-2 p-4 pb-3">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="min-w-0 flex-1 text-left outline-none focus-visible:underline"
          >
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={cn("font-semibold", done && "text-muted-foreground")}>{milestone.title}</span>
              {isCurrent && (
                <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium tracking-wide text-primary uppercase">
                  Current
                </span>
              )}
              <SourceHint source={milestone.source} />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {STATUS_LABEL[milestone.status]}
              {hasMissions && ` · ${completed}/${countable} missions`}
            </span>
          </button>

          <ChevronDownIcon
            className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", !expanded && "-rotate-90")}
            aria-hidden
          />

          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label={`Options for ${milestone.title}`} />}
              >
                <EllipsisVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                {!hasMissions &&
                  (done ? (
                    <DropdownMenuItem onClick={() => onSetStatus("PENDING")}>
                      <RotateCcwIcon />
                      Mark not done
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => onSetStatus("COMPLETED")}>
                        <CheckIcon />
                        Mark complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSetStatus("SKIPPED")}>
                        <SkipForwardIcon />
                        Skip
                      </DropdownMenuItem>
                    </>
                  ))}
                <DropdownMenuItem disabled={isFirst || busy} onClick={() => onMove(-1)}>
                  <ArrowUpIcon />
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isLast || busy} onClick={() => onMove(1)}>
                  <ArrowDownIcon />
                  Move down
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {expanded && (
          <div className="space-y-3 px-4 pb-4">
            {milestone.description && <p className="text-sm text-pretty text-muted-foreground">{milestone.description}</p>}

            {hasMissions && (
              <ul className="space-y-1" aria-label={`Missions in ${milestone.title}`}>
                {milestone.missions.map((mission, missionIndex) => (
                  <MissionRow
                    key={mission.id}
                    mission={mission}
                    isFirst={missionIndex === 0}
                    isLast={missionIndex === milestone.missions.length - 1}
                    readOnly={readOnly}
                    onStatus={(status) => onMissionStatus(mission, status)}
                    onEdit={() => onEditMission(mission)}
                    onDelete={() => onDeleteMission(mission)}
                    onMove={(direction) => onMoveMission(mission, direction)}
                  />
                ))}
              </ul>
            )}

            {!readOnly && milestone.missions.length < MAX_MISSIONS_PER_MILESTONE && (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  addMission();
                }}
              >
                <label htmlFor={`add-mission-${milestone.id}`} className="sr-only">
                  Add a mission to {milestone.title}
                </label>
                <Input
                  id={`add-mission-${milestone.id}`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={hasMissions ? "Add another mission" : "Add the first mission"}
                  maxLength={120}
                  className="h-8"
                />
                <Button type="submit" variant="secondary" size="sm" className="h-8" disabled={adding || draft.trim().length < 2}>
                  <PlusIcon data-icon="inline-start" />
                  Add
                </Button>
              </form>
            )}
            {addError && <p role="alert" className="text-xs text-destructive">{addError}</p>}
          </div>
        )}
      </div>
    </li>
  );
}

function MissionRow({
  mission,
  isFirst,
  isLast,
  readOnly,
  onStatus,
  onEdit,
  onDelete,
  onMove,
}: {
  mission: RoadmapMission;
  isFirst: boolean;
  isLast: boolean;
  readOnly: boolean;
  onStatus: (status: MilestoneStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const completed = mission.status === "COMPLETED";
  const skipped = mission.status === "SKIPPED";

  return (
    <li className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40">
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={`Mark “${mission.title}” ${completed ? "not done" : "done"}`}
        disabled={readOnly || skipped}
        onClick={() => onStatus(completed ? "PENDING" : "COMPLETED")}
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
          completed ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary",
          skipped && "border-dashed",
        )}
      >
        {completed ? <CheckIcon className="size-3.5" /> : skipped ? <CircleDashedIcon className="size-3 text-muted-foreground" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm text-pretty",
            completed && "text-muted-foreground line-through decoration-muted-foreground/50",
            skipped && "text-muted-foreground",
          )}
        >
          {mission.title}
          {skipped && <span className="ml-2 text-xs no-underline">(skipped)</span>}
        </p>
        {mission.description && <p className="text-xs text-muted-foreground">{mission.description}</p>}
      </div>

      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Options for ${mission.title}`}
                className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
              />
            }
          >
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            {skipped ? (
              <DropdownMenuItem onClick={() => onStatus("PENDING")}>
                <RotateCcwIcon />
                Restore
              </DropdownMenuItem>
            ) : (
              !completed && (
                <DropdownMenuItem onClick={() => onStatus("SKIPPED")}>
                  <SkipForwardIcon />
                  Skip
                </DropdownMenuItem>
              )
            )}
            <DropdownMenuItem disabled={isFirst} onClick={() => onMove(-1)}>
              <ArrowUpIcon />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLast} onClick={() => onMove(1)}>
              <ArrowDownIcon />
              Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
