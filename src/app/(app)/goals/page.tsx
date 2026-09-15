import { MapIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { GoalCard } from "@/components/goals/goal-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RECOMMENDED_MAX_ACTIVE_GOALS } from "@/modules/goals/status";
import type { GoalListView } from "@/server/repositories/goal.repository";
import { getGoalsOverview } from "@/server/services/goal-view.service";

export const metadata: Metadata = { title: "Goals" };

const VIEWS: { key: GoalListView; label: string }[] = [
  { key: "current", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

const EMPTY: Record<GoalListView, { title: string; description: string }> = {
  current: {
    title: "No goals in progress",
    description: "What would make the next few months meaningful? Start with one goal — AROHA will help you break it down.",
  },
  completed: { title: "No completed goals yet", description: "Finished goals will live here as part of your story." },
  archived: { title: "Nothing archived", description: "Goals you put away are kept here, safe and restorable." },
};

export default async function GoalsPage(props: PageProps<"/goals">) {
  const { view: rawView } = await props.searchParams;
  const view = VIEWS.some((v) => v.key === rawView) ? (rawView as GoalListView) : "current";
  const overview = await getGoalsOverview(view);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Goals"
        title="Where you're headed"
        description="Big goals, broken into milestones and missions you can actually finish."
        actions={
          <Link href="/goals/new" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" />
            New goal
          </Link>
        }
      />

      <nav aria-label="Goal views" className="flex gap-1 border-b">
        {VIEWS.map((item) => {
          const active = item.key === view;
          return (
            <Link
              key={item.key}
              href={item.key === "current" ? "/goals" : `/goals?view=${item.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{overview.counts[item.key]}</span>
            </Link>
          );
        })}
      </nav>

      {view === "current" && overview.activeCount > RECOMMENDED_MAX_ACTIVE_GOALS && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          You have {overview.activeCount} active goals. Real progress usually comes from focusing on two or three —
          consider pausing a few.
        </p>
      )}

      {overview.goals.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title={EMPTY[view].title}
          description={EMPTY[view].description}
          action={
            view === "current" ? (
              <Link href="/goals/new" className={buttonVariants()}>
                <PlusIcon data-icon="inline-start" />
                Create your first goal
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {overview.goals.map((goal) => (
            <li key={goal.id}>
              <GoalCard goal={goal} today={overview.today} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
