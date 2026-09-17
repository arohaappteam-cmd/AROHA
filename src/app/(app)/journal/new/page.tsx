import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { JournalEntryForm } from "@/components/reflection/journal-entry-form";
import { todayInTimezone } from "@/modules/goals/dates";
import { createJournalEntryAction } from "@/server/actions/journal.actions";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "New journal entry" };

export default async function NewJournalEntryPage() {
  await connection();
  const user = await getCurrentUser();
  const today = todayInTimezone(user.timezone);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Journal" title="New entry" />
      <JournalEntryForm
        initial={{ title: "", body: "", mood: null, date: today }}
        maxDate={today}
        submit={createJournalEntryAction}
        cancelHref="/journal"
        submitLabel="Save entry"
      />
    </div>
  );
}
