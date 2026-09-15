import { ArchiveIcon, CheckCircle2Icon, CrownIcon, PauseIcon } from "lucide-react";

import type { GoalStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const pill = "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium";

export function GoalStatusBadge({ status, archived }: { status: GoalStatus; archived?: boolean }) {
  if (archived) {
    return (
      <span className={cn(pill, "bg-muted text-muted-foreground")}>
        <ArchiveIcon className="size-3" aria-hidden />
        Archived
      </span>
    );
  }
  if (status === "PAUSED") {
    return (
      <span className={cn(pill, "bg-amber-500/15 text-amber-600 dark:text-amber-300")}>
        <PauseIcon className="size-3" aria-hidden />
        Paused
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className={cn(pill, "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300")}>
        <CheckCircle2Icon className="size-3" aria-hidden />
        Completed
      </span>
    );
  }
  return <span className={cn(pill, "bg-primary/15 text-primary")}>Active</span>;
}

export function MajorGoalBadge() {
  return (
    <span className={cn(pill, "bg-xp/15 text-xp")}>
      <CrownIcon className="size-3" aria-hidden />
      Major goal
    </span>
  );
}

export function ProgressBar({
  percent,
  label,
  className,
  tone = "primary",
}: {
  percent: number;
  label: string;
  className?: string;
  tone?: "primary" | "success";
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", tone === "success" ? "bg-emerald-500" : "bg-primary")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
