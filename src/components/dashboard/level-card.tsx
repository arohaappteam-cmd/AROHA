import { SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/server/services/dashboard.service";

const numberFormat = new Intl.NumberFormat("en");

export function LevelCard({ progress }: { progress: DashboardData["progress"] }) {
  return (
    <Card className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]"
      />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-4 text-xp" aria-hidden />
          Character level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-semibold tabular-nums">
              {progress.level}
            </span>
            <Badge variant="secondary">{progress.tier}</Badge>
          </div>
          <p className="text-right text-sm text-muted-foreground tabular-nums">
            {numberFormat.format(progress.totalXp)} XP total
          </p>
        </div>

        <div className="space-y-2">
          <div
            role="progressbar"
            aria-label={`Progress to level ${progress.level + 1}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-xp transition-[width] duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>
              {numberFormat.format(progress.xpIntoLevel)} /{" "}
              {numberFormat.format(progress.xpForNextLevel)} XP
            </span>
            <span>
              {numberFormat.format(progress.xpToNextLevel)} XP to level{" "}
              {progress.level + 1}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
