import { LockKeyholeIcon, MoonStarIcon, NotebookPenIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ReflectionSummary } from "@/components/reflection/reflection-summary";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { displayDateOnly, formatDateOnly } from "@/modules/goals/dates";
import { journalPreview } from "@/modules/reflection/journal";
import { moodMeta } from "@/modules/reflection/reflection";
import { getCurrentUser } from "@/server/auth/current-user";
import { listEntries, PAGE_SIZE } from "@/server/services/journal.service";
import { getReflectionDay, listRecentReflections } from "@/server/services/reflection.service";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage(props: PageProps<"/journal">) {
  await connection();
  const { show } = await props.searchParams;
  const user = await getCurrentUser();
  const limit = Number(typeof show === "string" ? show : PAGE_SIZE) || PAGE_SIZE;

  const [today, reflections, journal] = await Promise.all([
    getReflectionDay(user),
    listRecentReflections(user, 7),
    listEntries(user, limit),
  ]);
  const past = reflections.filter((reflection) => reflection.date !== today.date);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Journal"
        title="Reflect and remember"
        description="End each day with a few honest questions, and keep a private journal for everything else."
        actions={
          <Link href="/journal/new" className={buttonVariants({ variant: "outline" })}>
            <PlusIcon data-icon="inline-start" />
            New entry
          </Link>
        }
      />

      <section aria-labelledby="today-title" className="space-y-4">
        <h2 id="today-title" className="text-lg font-semibold">
          Today
        </h2>
        {today.reflection ? (
          <div className="space-y-2">
            <ReflectionSummary reflection={today.reflection} />
            <Link href="/journal/reflect" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Edit today&apos;s reflection
            </Link>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <MoonStarIcon className="size-8 shrink-0 text-primary" aria-hidden />
              <div className="flex-1 space-y-1">
                <p className="font-medium">How did today go?</p>
                <p className="text-sm text-muted-foreground">
                  Five short questions about what you learned, what went well and what was hard. It takes about a minute.
                </p>
              </div>
              <Link href="/journal/reflect" className={buttonVariants()}>
                Reflect on today
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="reflections-title" className="space-y-3">
          <h2 id="reflections-title" className="text-lg font-semibold">
            Recent reflections
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {past.map((reflection) => {
              const mood = moodMeta(reflection.mood);
              return (
                <li key={reflection.id}>
                  <Link
                    href={`/journal/reflect?date=${reflection.date}`}
                    className="block h-full space-y-1.5 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <p className="flex items-center justify-between gap-2 text-sm font-medium">
                      {displayDateOnly(reflection.date)}
                      {mood && (
                        <span className="text-xs font-normal text-muted-foreground">
                          <span aria-hidden>{mood.emoji}</span> {mood.label}
                        </span>
                      )}
                    </p>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {reflection.aiSummary ?? reflection.learned ?? reflection.wentWell ?? "Reflection saved."}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="journal-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="journal-title" className="text-lg font-semibold">
              Private journal
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <LockKeyholeIcon className="size-3.5" aria-hidden />
              Only you can see these. Never shared, never sent to AI.
            </p>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {journal.total} entr{journal.total === 1 ? "y" : "ies"}
          </span>
        </div>

        {journal.entries.length === 0 ? (
          <EmptyState
            icon={NotebookPenIcon}
            title="Nothing written yet"
            description="A thought, a worry, a win, a plan. Write whatever you want to remember."
            action={
              <Link href="/journal/new" className={buttonVariants()}>
                <PlusIcon data-icon="inline-start" />
                Write your first entry
              </Link>
            }
          />
        ) : (
          <>
            <ul className="divide-y rounded-2xl border bg-card">
              {journal.entries.map((entry) => {
                const mood = moodMeta(entry.mood);
                return (
                  <li key={entry.id}>
                    <Link href={`/journal/${entry.id}`} className="block space-y-1 px-4 py-3.5 hover:bg-muted/30">
                      <p className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium">{entry.title ?? displayDateOnly(formatDateOnly(entry.date))}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {mood && <span aria-label={mood.label}>{mood.emoji} </span>}
                          {displayDateOnly(formatDateOnly(entry.date))}
                        </span>
                      </p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{journalPreview(entry.body)}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {journal.hasMore && (
              <Link href={`/journal?show=${journal.shown + PAGE_SIZE}`} className={buttonVariants({ variant: "outline", size: "sm" })} scroll={false}>
                Show more
              </Link>
            )}
          </>
        )}
      </section>
    </div>
  );
}
