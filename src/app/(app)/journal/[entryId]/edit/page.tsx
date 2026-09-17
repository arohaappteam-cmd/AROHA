import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { JournalEntryForm } from "@/components/reflection/journal-entry-form";
import { formatDateOnly, todayInTimezone } from "@/modules/goals/dates";
import { updateJournalEntryAction } from "@/server/actions/journal.actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { getEntry } from "@/server/services/journal.service";

export const metadata: Metadata = { title: "Edit journal entry" };

export default async function EditJournalEntryPage(props: PageProps<"/journal/[entryId]/edit">) {
  const { entryId } = await props.params;
  const user = await getCurrentUser();
  const entry = await getEntry(user, entryId);
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Journal" title="Edit entry" />
      <JournalEntryForm
        initial={{ title: entry.title ?? "", body: entry.body, mood: entry.mood, date: formatDateOnly(entry.date) }}
        maxDate={todayInTimezone(user.timezone)}
        submit={updateJournalEntryAction.bind(null, entry.id)}
        cancelHref={`/journal/${entry.id}`}
        submitLabel="Save changes"
      />
    </div>
  );
}
