"use client";

import {
  CalendarArrowUpIcon,
  CheckIcon,
  LoaderCircleIcon,
  PlayIcon,
  RepeatIcon,
  RotateCcwIcon,
  SkipForwardIcon,
  Undo2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { LevelUpCelebration, useLevelUp } from "@/components/progression/level-up-celebration";
import { QuestResult, useQuestResult } from "@/components/quests/quest-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { SKIP_REASONS, skipReasonLabel } from "@/modules/quests/status";
import {
  completeQuestAction,
  deferQuestAction,
  restoreQuestAction,
  saveReflectionAction,
  skipQuestAction,
  startQuestAction,
  swapQuestAction,
  undoCompletionAction,
} from "@/server/actions/quest.actions";
import type { QuestDetail } from "@/server/services/quest-view.service";

type Values = { reflection: string; result: string; evidenceUrl: string };

function fieldError(result: ActionResult | null, field: string) {
  return result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined;
}

export function QuestActionPanel({ quest, reflectionPrompt }: { quest: QuestDetail; reflectionPrompt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState(false);
  const { levelUp, clearLevelUp, noticeProgression } = useLevelUp();
  const { questResult, showQuestResult, clearQuestResult } = useQuestResult();
  const [completeMission, setCompleteMission] = useState(false);
  const [values, setValues] = useState<Values>({
    reflection: quest.completion?.note ?? "",
    result: quest.completion?.result ?? "",
    evidenceUrl: quest.completion?.evidenceUrl ?? "",
  });
  const can = (action: QuestDetail["actions"][number]) => quest.actions.includes(action);

  const run = (action: () => Promise<ActionResult>, after?: () => void) => {
    startTransition(async () => {
      const next = await action();
      setResult(next);
      if (next.ok) after?.();
    });
  };

  const set = (key: keyof Values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const missionOpen = quest.mission?.status === "PENDING";
  const showForm = can("complete") || (quest.status === "COMPLETED" && editing);

  const form = (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (quest.status === "COMPLETED") {
          run(() => saveReflectionAction({ questId: quest.id, ...values }), () => setEditing(false));
        } else {
          startTransition(async () => {
            const next = await completeQuestAction({ questId: quest.id, ...values, completeMission });
            setResult(next);
            if (next.ok) {
              noticeProgression(next.data.progression);
              if (!next.data.progression.leveledUp) showQuestResult({ title: quest.title, payload: next.data });
            }
          });
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="reflection">
          Reflection <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id="reflection" rows={3} maxLength={1000} value={values.reflection} onChange={set("reflection")} placeholder={reflectionPrompt} />
        {fieldError(result, "reflection") && <p className="text-xs text-destructive">{fieldError(result, "reflection")}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="result">
            Result <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="result" maxLength={120} value={values.result} onChange={set("result")} placeholder="e.g. 32 minutes, 15 pages, 5 km" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="evidence">
            Link <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="evidence" type="url" maxLength={500} value={values.evidenceUrl} onChange={set("evidenceUrl")} placeholder="https://…" />
          {fieldError(result, "evidenceUrl") && <p className="text-xs text-destructive">{fieldError(result, "evidenceUrl")}</p>}
        </div>
      </div>

      {quest.status !== "COMPLETED" && quest.mission && missionOpen && (
        <label className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
          <input
            type="checkbox"
            checked={completeMission}
            onChange={(event) => setCompleteMission(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span>
            This finished the mission <span className="font-medium">“{quest.mission.title}”</span>
            <span className="block text-xs text-muted-foreground">Leave unticked if you only made progress on it.</span>
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
          {quest.status === "COMPLETED" ? "Save reflection" : "Complete quest"}
        </Button>
        {quest.status === "COMPLETED" && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  return (
    <div className="space-y-5">
      {!quest.isToday && (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          This quest was part of {quest.date}. Past days are kept as your record.
        </p>
      )}

      {quest.status === "IN_PROGRESS" && (
        <p className="text-sm text-primary">You started this quest. When it&apos;s done, record it below.</p>
      )}
      {quest.status === "SKIPPED" && (
        <p className="text-sm text-muted-foreground">
          Skipped{quest.skipReason ? ` — ${skipReasonLabel(quest.skipReason)?.toLowerCase()}` : ""}. No problem: tomorrow&apos;s quests take it into account.
        </p>
      )}
      {quest.status === "DEFERRED" && <p className="text-sm text-muted-foreground">Moved to tomorrow. It&apos;ll be on your path when you open AROHA.</p>}
      {quest.status === "EXPIRED" && <p className="text-sm text-muted-foreground">This day passed before the quest was finished — and that&apos;s okay.</p>}

      {can("start") && (
        <Button size="lg" disabled={pending} onClick={() => run(() => startQuestAction(quest.id), () => router.push("/"))}>
          <PlayIcon data-icon="inline-start" />
          Start quest
        </Button>
      )}

      {quest.status === "COMPLETED" && quest.completion && !editing && (
        <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-300">
            <CheckIcon className="size-4" aria-hidden />
            Quest complete
            <span className="text-sm font-normal text-muted-foreground">
              · {new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(quest.completion.completedAt))}
            </span>
          </p>
          {quest.completion.note ? (
            <blockquote className="border-l-2 border-emerald-500/50 pl-3 text-sm whitespace-pre-line">{quest.completion.note}</blockquote>
          ) : (
            <p className="text-sm text-muted-foreground">No reflection yet. {reflectionPrompt}</p>
          )}
          {(quest.completion.result || quest.completion.evidenceUrl) && (
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {quest.completion.result && (
                <div className="flex gap-1.5">
                  <dt className="text-muted-foreground">Result</dt>
                  <dd>{quest.completion.result}</dd>
                </div>
              )}
              {quest.completion.evidenceUrl && (
                <div className="flex min-w-0 gap-1.5">
                  <dt className="text-muted-foreground">Link</dt>
                  <dd className="truncate">
                    <a href={quest.completion.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {quest.completion.evidenceUrl}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              {quest.completion.note ? "Edit reflection" : "Add a reflection"}
            </Button>
            {can("undo") && (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => undoCompletionAction(quest.id))}>
                <Undo2Icon data-icon="inline-start" />
                Mark as not done
              </Button>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="space-y-3 rounded-xl border p-4">
          {quest.status !== "COMPLETED" && <p className="font-medium">Done it? Record it.</p>}
          {form}
        </div>
      )}

      {can("restore") && (
        <Button variant="outline" disabled={pending} onClick={() => run(() => restoreQuestAction(quest.id))}>
          <RotateCcwIcon data-icon="inline-start" />
          Bring it back
        </Button>
      )}

      {(can("swap") || can("defer") || can("skip")) &&
        (asking ? (
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
          <div className="flex flex-wrap gap-1 border-t pt-3 text-muted-foreground">
            {can("swap") && (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => swapQuestAction(quest.id))}>
                <RepeatIcon data-icon="inline-start" />
                Swap for a different quest
              </Button>
            )}
            {can("defer") && (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => deferQuestAction(quest.id))}>
                <CalendarArrowUpIcon data-icon="inline-start" />
                Move to tomorrow
              </Button>
            )}
            {can("skip") && (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => setAsking(true)}>
                <SkipForwardIcon data-icon="inline-start" />
                Skip today
              </Button>
            )}
          </div>
        ))}

      {result && !result.ok && !result.fieldErrors?.reflection && !result.fieldErrors?.evidenceUrl && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
      {result?.ok && result.message && (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-300">
          {result.message}
        </p>
      )}

      {levelUp && <LevelUpCelebration outcome={levelUp} onClose={clearLevelUp} />}
      {questResult && <QuestResult result={questResult} onClose={clearQuestResult} />}
    </div>
  );
}
