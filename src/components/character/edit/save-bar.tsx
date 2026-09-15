"use client";

import { CheckCircle2Icon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

function Status({ pending, result, changed }: { pending: boolean; result: ActionResult | null; changed: boolean }) {
  if (pending) return null;
  if (result && !result.ok) {
    return (
      <span className="flex items-center gap-1.5 text-destructive">
        <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
        {result.error}
      </span>
    );
  }
  if (changed) return <span className="text-muted-foreground">Unsaved changes</span>;
  if (result?.ok) {
    return (
      <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
        <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />
        {result.message ?? "Saved"}
      </span>
    );
  }
  return null;
}

export function SaveBar({
  pending,
  result,
  dirty,
  changed = dirty,
  label = "Save",
  onSave,
}: {
  pending: boolean;
  result: ActionResult | null;
  /** Enables the save button. */
  dirty: boolean;
  /** Differs from the last saved value; shows "Unsaved changes". */
  changed?: boolean;
  label?: string;
  /** Omit when the bar sits inside a <form> and should submit it. */
  onSave?: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t pt-4">
      <p role="status" aria-live="polite" className="mr-auto min-h-5 text-sm">
        <Status pending={pending} result={result} changed={changed} />
      </p>
      <Button type={onSave ? "button" : "submit"} onClick={onSave} disabled={pending || !dirty}>
        {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}
