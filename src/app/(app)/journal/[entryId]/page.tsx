import { ArrowLeftIcon, LockKeyholeIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteEntryButton } from "@/components/reflection/delete-entry-button";
import { buttonVariants } from "@/components/ui/button";
import { displayDateOnly, formatDateOnly } from "@/modules/goals/dates";
import { moodMeta } from "@/modules/reflection/reflection";
import { getCurrentUser } from "@/server/auth/current-user";
import { getEntry } from "@/server/services/journal.service";
import { Glyph } from "@/components/common/glyph";

// Journal entries are private: keep them out of page titles and previews.
export const metadata: Metadata = { title: "Journal entry" };

export default async function JournalEntryPage(props: PageProps<"/journal/[entryId]">) {
  const { entryId } = await props.params;
  const user = await getCurrentUser();
  const entry = await getEntry(user, entryId);
  if (!entry) notFound();

  const mood = moodMeta(entry.mood);
  const date = displayDateOnly(formatDateOnly(entry.date));

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/journal" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
          <ArrowLeftIcon data-icon="inline-start" />
          Journal
        </Link>
        <div className="flex items-center gap-1">
          <Link href={`/journal/${entry.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Link>
          <DeleteEntryButton entryId={entry.id} />
        </div>
      </div>

      <header className="space-y-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{date}</span>
          {mood && (
            <span>
              <span aria-hidden><Glyph emoji={mood.emoji} /></span> {mood.label}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs">
            <LockKeyholeIcon className="size-3" aria-hidden />
            Private
          </span>
        </p>
        {entry.title && <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{entry.title}</h1>}
      </header>

      <div className="text-base leading-relaxed whitespace-pre-line">{entry.body}</div>

      {entry.updatedAt.getTime() - entry.createdAt.getTime() > 60_000 && (
        <p className="text-xs text-muted-foreground">Edited {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(entry.updatedAt)}</p>
      )}
    </article>
  );
}
