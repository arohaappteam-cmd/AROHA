import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ATTRIBUTES } from "@/modules/progression/attributes";
import type { DashboardData } from "@/server/services/dashboard.service";

/** Bars are relative to the strongest attribute, with a floor so early
 *  progress doesn't look maxed out. Progression indicators, not measurements. */
const SCALE_FLOOR = 100;

export function AttributesCard({ attributes }: { attributes: DashboardData["attributes"] }) {
  const totals = new Map(attributes.map((a) => [a.attribute, a.total]));
  const highest = Math.max(SCALE_FLOOR, ...attributes.map((a) => a.total));
  const hasAny = attributes.some((a) => a.total > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attributes</CardTitle>
        <CardDescription>
          {hasAny
            ? "Grown through completed real-world actions."
            : "Every attribute starts at zero and grows as you complete quests."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {ATTRIBUTES.map((meta) => {
            const total = totals.get(meta.key) ?? 0;
            const percent = Math.round((total / highest) * 100);
            return (
              <li key={meta.key} title={meta.description} className="space-y-1">
                <div className="flex items-baseline gap-2 text-sm">
                  <span aria-hidden>{meta.emoji}</span>
                  <span className="flex-1 truncate">{meta.label}</span>
                  <span className="font-medium tabular-nums">{total}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${meta.label}: ${total} points`}
                  aria-valuemin={0}
                  aria-valuemax={highest}
                  aria-valuenow={total}
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
