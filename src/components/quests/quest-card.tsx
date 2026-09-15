"use client";

import {
  ArrowRightIcon,
  CalendarArrowUpIcon,
  CheckIcon,
  LoaderCircleIcon,
  NotebookPenIcon,
  PlayIcon,
  RepeatIcon,
  RotateCcwIcon,
  SkipForwardIcon,
  Undo2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { LevelUpCelebration, useLevelUp } from "@/components/progression/level-up-celebration";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { categoryFor } from "@/modules/quests/categories";
import { SKIP_REASONS, skipReasonLabel } from "@/modules/quests/status";
import {
  completeQuestAction,
  deferQuestAction,
  restoreQuestAction,
  skipQuestAction,
  startQuestAction,
  swapQuestAction,
  undoCompletionAction,
} from "@/server/actions/quest.actions";
import type { QuestView } from "@/server/services/quest-view.service";

import { categoryStyle } from "./category-style";
import { QuestMeta } from "./quest-meta";

const timeFormat = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

export function QuestCard({ quest, xpAwarded, compact = false }: { quest: QuestView; xpAwarded: boolean; compact?: boolean }) {
  const category = categoryFor(quest.lifeArea);
  const style = categoryStyle(quest.lifeArea);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const { levelUp, clearLevelUp, noticeProgression } = useLevelUp();
  const can = (action: QuestView["actions"][number]) => quest.actions.includes(action);

  const run = (action: () => Promise<ActionResult>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) after?.();
      else setError(result.error);
    });
  };

  // Completion is its own handler so it can celebrate a level-up.
  const complete = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeQuestAction({ questId: quest.id });
      if (result.ok) noticeProgression(result.data.progression);
      else setError(result.error);
    });
  };

  const done = quest.status === "COMPLETED";
  const set = quest.status === "SKIPPED" || quest.status === "DEFERRED" || quest.status === "EXPIRED";
  const active = quest.status === "IN_PROGRESS";
  const href = `/quests/${quest.id}`;

  return (
    <article
      aria-labelledby={`quest-${quest.id}-title`}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card transition-[border-color,opacity]",
        active && style.border,
        done && "border-emerald-500/40",
        set && "opacity-70",
      )}
    >
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", done ? "bg-[radial-gradient(ellipse_at_top_left,oklch(0.72_0.15_160/0.16),transparent_60%)]" : style.glow)} />

      <div className={cn("relative flex flex-col gap-4", compact ? "p-4" : "p-5")}>
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("text-[11px] font-semibold tracking-[0.18em] uppercase", style.text)}>{category.verb}</span>
            <span className="text-xs text-muted-foreground">· {category.label}</span>
            {quest.carriedOver && (
              <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">From yesterday</span>
            )}
            {!quest.isCore && (
              <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">Side quest</span>
            )}
          </div>
          <StatusBadge quest={quest} />
        </header>

        <div className="space-y-1.5">
          <h3 id={`quest-${quest.id}-title`} className={cn("font-semibold text-balance", compact ? "text-base" : "text-lg leading-snug md:text-xl")}>
            <Link href={href} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
              {quest.title}
            </Link>
          </h3>
          {quest.description && !compact && <p className="text-sm text-pretty text-muted-foreground">{quest.description}</p>}
        </div>

        <QuestMeta difficulty={quest.difficulty} minutes={quest.estimatedMinutes} xp={quest.xpReward} xpAwarded={xpAwarded} />

        {/* Actions sit above the full-card link. */}
        <div className="relative z-10 space-y-3">
          {quest.status === "SKIPPED" && (
            <p className="text-sm text-muted-foreground">
              Skipped{quest.skipReason ? ` — ${skipReasonLabel(quest.skipReason)?.toLowerCase()}` : ""}. That&apos;s okay; tomorrow adapts.
            </p>
          )}
          {quest.status === "DEFERRED" && <p className="text-sm text-muted-foreground">Moved to tomorrow. It&apos;ll be waiting for you.</p>}
          {quest.status === "EXPIRED" && <p className="text-sm text-muted-foreground">This day has passed.</p>}
          {done && quest.completion && (
            <p className="text-sm text-emerald-600 dark:text-emerald-300">
              Done at {timeFormat.format(new Date(quest.completion.completedAt))}
              {quest.completion.result ? ` · ${quest.completion.result}` : ""}
            </p>
          )}
          {active && quest.startedAt && (
            <p className={cn("inline-flex items-center gap-2 text-sm", style.text)}>
              <span className="relative flex size-2">
                <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", style.solid)} />
                <span className={cn("relative inline-flex size-2 rounded-full", style.solid)} />
              </span>
              In progress since {timeFormat.format(new Date(quest.startedAt))} — go live it, then come back.
            </p>
          )}

          {asking ? (
            <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
              <p className="text-sm font-medium">No problem. What got in the way?</p>
              <div className="flex flex-wrap gap-1.5">
                {SKIP_REASONS.map((reason) => (
                  <button
                    key={reason.key}
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => skipQuestAction({ questId: quest.id, reason: reason.key }), () => setAsking(false))}
                    className="rounded-full border bg-background px-3 py-1 text-sm transition-colors hover:border-primary/60 disabled:opacity-50"
                  >
                    {reason.label}
                  </button>
                ))}
                <button type="button" onClick={() => setAsking(false)} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {can("start") && (
                <Button disabled={pending} onClick={() => run(() => startQuestAction(quest.id))}>
                  {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <PlayIcon data-icon="inline-start" />}
                  Start quest
                </Button>
              )}
              {can("complete") && (
                <Button
                  variant={active ? "default" : "outline"}
                  disabled={pending}
                  onClick={complete}
                >
                  <CheckIcon data-icon="inline-start" />
                  {active ? "Complete quest" : "Already done"}
                </Button>
              )}
              {done && (
                <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-primary hover:underline">
                  <NotebookPenIcon className="size-4" aria-hidden />
                  {quest.completion?.note ? "View reflection" : "Add a reflection"}
                </Link>
              )}
              {can("restore") && (
                <Button variant="outline" disabled={pending} onClick={() => run(() => restoreQuestAction(quest.id))}>
                  <RotateCcwIcon data-icon="inline-start" />
                  Bring it back
                </Button>
              )}

              <div className="ml-auto flex items-center gap-0.5 text-muted-foreground">
                {can("swap") && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => swapQuestAction(quest.id))} title="Get a different quest for this category">
                    <RepeatIcon data-icon="inline-start" />
                    Swap
                  </Button>
                )}
                {can("defer") && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => deferQuestAction(quest.id))} title="Offer this quest again tomorrow">
                    <CalendarArrowUpIcon data-icon="inline-start" />
                    Tomorrow
                  </Button>
                )}
                {can("skip") && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => setAsking(true)}>
                    <SkipForwardIcon data-icon="inline-start" />
                    Skip
                  </Button>
                )}
                {can("undo") && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => undoCompletionAction(quest.id))} title="Mark as not done">
                    <Undo2Icon data-icon="inline-start" />
                    Undo
                  </Button>
                )}
                {!compact && (
                  <Link href={href} aria-label={`Open ${quest.title}`} className="grid size-8 place-items-center rounded-lg hover:bg-muted hover:text-foreground">
                    <ArrowRightIcon className="size-4" aria-hidden />
                  </Link>
                )}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>

      {levelUp && <LevelUpCelebration outcome={levelUp} onClose={clearLevelUp} />}
    </article>
  );
}

function StatusBadge({ quest }: { quest: QuestView }) {
  const pill = "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium";
  switch (quest.status) {
    case "COMPLETED":
      return (
        <span className={cn(pill, "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300")}>
          <CheckIcon className="size-3" aria-hidden />
          Complete
        </span>
      );
    case "IN_PROGRESS":
      return <span className={cn(pill, "bg-primary/15 text-primary")}>In progress</span>;
    case "SKIPPED":
      return <span className={cn(pill, "bg-muted text-muted-foreground")}>Skipped</span>;
    case "DEFERRED":
      return <span className={cn(pill, "bg-muted text-muted-foreground")}>Tomorrow</span>;
    case "EXPIRED":
      return <span className={cn(pill, "bg-muted text-muted-foreground")}>Missed</span>;
    default:
      return null;
  }
}
