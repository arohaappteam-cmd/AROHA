import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SelfComparison } from "@/modules/social/leaderboards";

const numberFormat = new Intl.NumberFormat("en");

/**
 * The comparison that comes first, everywhere in the community section: the
 * user against their own previous month. Other people's numbers are never
 * shown beside these.
 */
export function SelfComparisonCard({ comparison, compact = false }: { comparison: SelfComparison[]; compact?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>You vs. your previous self</CardTitle>
        <CardDescription>
          The last 28 days against the 28 before them. This is the comparison that matters — everything below it is optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {comparison.map((entry) => (
            <div key={entry.key} className="rounded-xl border p-3">
              <dt className="text-xs text-muted-foreground">{entry.label}</dt>
              <dd className="text-xl font-semibold">{numberFormat.format(entry.current)}</dd>
              <dd className="text-xs text-muted-foreground text-pretty">{entry.summary}</dd>
            </div>
          ))}
        </dl>
        {compact && (
          <Link href="/insights" className={buttonVariants({ variant: "outline", size: "sm" })}>
            See your full trends
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
