import Link from "next/link";

import { cn } from "@/lib/utils";
import { ANALYTICS_RANGES, DEFAULT_RANGE, type AnalyticsRangeKey } from "@/modules/analytics/dataset";

export function RangeTabs({ active }: { active: AnalyticsRangeKey }) {
  return (
    <nav aria-label="Time range" className="inline-flex rounded-lg border bg-muted/40 p-0.5">
      {(Object.keys(ANALYTICS_RANGES) as AnalyticsRangeKey[]).map((key) => (
        <Link
          key={key}
          href={key === DEFAULT_RANGE ? "/insights" : `/insights?range=${key}`}
          aria-current={key === active ? "page" : undefined}
          scroll={false}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            key === active ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {ANALYTICS_RANGES[key].label}
        </Link>
      ))}
    </nav>
  );
}
