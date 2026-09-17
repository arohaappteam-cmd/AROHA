"use client";

import { Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteJournalEntryAction } from "@/server/actions/journal.actions";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <Trash2Icon data-icon="inline-start" />
        Delete
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      Delete this entry for good?
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteJournalEntryAction(entryId);
            if (!result.ok) setError(result.error);
          })
        }
      >
        Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
      {error && <span className="text-destructive">{error}</span>}
    </span>
  );
}
