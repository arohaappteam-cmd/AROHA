import { FlameIcon, MapIcon, TrophyIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardData } from "@/server/services/dashboard.service";

function SummaryItem({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  href?: string;
}) {
  const content = (
    <Card size="sm" className={href ? "h-full transition-colors hover:ring-primary/40" : "h-full"}>
      <CardContent className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate font-medium">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {content}
    </Link>
  ) : (
    content
  );
}

export function JourneySummary({ data }: { data: DashboardData }) {
  const major = data.majorGoal;
  const goalCount = `${data.activeGoalCount} active goal${data.activeGoalCount === 1 ? "" : "s"}`;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryItem
        icon={MapIcon}
        label="Major goal"
        value={major?.title ?? "Not set"}
        hint={
          major
            ? `${major.percent}%${major.next ? ` · Next: ${major.next.mission?.title ?? major.next.milestone.title}` : ""}`
            : `${goalCount} · Set one in Goals`
        }
        href={major ? `/goals/${major.id}` : "/goals"}
      />
      <SummaryItem
        icon={FlameIcon}
        label="Best active streak"
        value={data.bestStreak ? `${data.bestStreak.count} days` : "—"}
        hint="Progress matters more than streaks"
      />
      <SummaryItem
        icon={TrophyIcon}
        label="Achievements"
        value={String(data.achievementCount)}
        hint="Unlocked milestones"
      />
    </div>
  );
}
