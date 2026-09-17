import { HistoryIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { JourneyTabs } from "@/components/journey/journey-tabs";
import { cn } from "@/lib/utils";
import { TIMELINE_KIND_META, TIMELINE_KINDS, type TimelineKind } from "@/modules/timeline/timeline";
import { getCurrentUser } from "@/server/auth/current-user";
import { getLifeTimeline } from "@/server/services/timeline.service";

export const metadata: Metadata = { title: "Life timeline" };

const dayFormat = (timezone: string) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: timezone });

function hrefFor(active: readonly TimelineKind[], kind: TimelineKind | null): string {
  if (kind === null) return "/journey/timeline";
  const next = active.includes(kind) ? active.filter((k) => k !== kind) : [...active, kind];
  return next.length === 0 ? "/journey/timeline" : `/journey/timeline?kind=${next.join(",")}`;
}

export default async function TimelinePage(props: PageProps<"/journey/timeline">) {
  await connection();
  const { kind } = await props.searchParams;
  const user = await getCurrentUser();
  const timeline = await getLifeTimeline(user, typeof kind === "string" ? kind.split(",") : []);
  const formatDay = dayFormat(user.timezone);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Journey"
        title="The story of your growth"
        description="Goals reached, things built, skills started and proven, challenges finished, experiments tried — in the order they happened."
      />
      <JourneyTabs active="/journey/timeline" />

      {timeline.total === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Your story starts with the first quest"
          description="Complete quests, finish projects and try experiments. The meaningful moments collect here on their own."
        />
      ) : (
        <>
          <nav aria-label="Filter the timeline" className="flex flex-wrap gap-1.5">
            <Link
              href={hrefFor(timeline.active, null)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                timeline.active.length === 0 ? "border-primary bg-primary/12 font-medium text-primary" : "hover:border-primary/50",
              )}
            >
              Everything <span className="tabular-nums">{timeline.total}</span>
            </Link>
            {TIMELINE_KINDS.filter((k) => timeline.counts[k] > 0).map((k) => {
              const selected = timeline.active.includes(k);
              return (
                <Link
                  key={k}
                  href={hrefFor(timeline.active, k)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    selected ? "border-primary bg-primary/12 font-medium text-primary" : "hover:border-primary/50",
                  )}
                >
                  {TIMELINE_KIND_META[k].plural} <span className="text-muted-foreground tabular-nums">{timeline.counts[k]}</span>
                </Link>
              );
            })}
          </nav>

          {timeline.years.length === 0 && <p className="text-sm text-muted-foreground">Nothing matches those filters yet.</p>}

          <div className="space-y-12">
            {timeline.years.map((year) => (
              <section key={year.year} aria-labelledby={`year-${year.year}`} className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
                  <h2 id={`year-${year.year}`} className="text-4xl font-semibold tracking-tight tabular-nums text-primary">
                    {year.year}
                  </h2>
                  <p className="pb-1 text-sm text-muted-foreground tabular-nums">
                    {year.count} moment{year.count === 1 ? "" : "s"}
                  </p>
                </div>

                {year.highlights.length > 0 && (
                  <ul className="flex flex-wrap gap-2" aria-label={`Highlights of ${year.year}`}>
                    {year.highlights.slice(0, 8).map((event) => (
                      <li key={event.id} className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 py-1 pr-3 pl-1.5 text-sm">
                        <span className="grid size-6 place-items-center rounded-full bg-card" aria-hidden>
                          {event.emoji}
                        </span>
                        {event.title}
                      </li>
                    ))}
                  </ul>
                )}

                {year.months.map((month) => (
                  <div key={month.key} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                    <h3 className="text-sm font-semibold text-muted-foreground sm:pt-1">{month.label}</h3>
                    <ol className="relative space-y-3 border-l pl-6">
                      {month.events.map((event) => {
                        const body = (
                          <>
                            <p className={cn("text-sm", event.major ? "font-semibold" : "font-medium")}>{event.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {formatDay.format(event.date)} · {TIMELINE_KIND_META[event.kind].label}
                              {event.detail ? ` · ${event.detail}` : ""}
                            </p>
                          </>
                        );
                        return (
                          <li key={event.id} className="relative">
                            <span
                              aria-hidden
                              className={cn(
                                "absolute -left-[37px] grid place-items-center rounded-full border bg-card",
                                event.major ? "top-0 size-7 border-primary/50 text-sm shadow-sm" : "top-0.5 size-6 text-xs",
                              )}
                            >
                              {event.emoji}
                            </span>
                            {event.href ? (
                              <Link href={event.href} className="block rounded-lg hover:underline">
                                {body}
                              </Link>
                            ) : (
                              body
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
