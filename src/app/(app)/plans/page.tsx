import { CheckIcon, MinusIcon } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { PLAN_STYLE, PlanBadge } from "@/components/plans/plan-badge";
import { PlanInterestButton } from "@/components/plans/plan-interest-button";
import { Button } from "@/components/ui/button";
import { PLAN_COMPARISON, PLAN_TIERS, PLANS } from "@/modules/plans/catalogue";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPlanOverview } from "@/server/services/plan.service";

export const metadata: Metadata = { title: "Plans" };

const FAQ = [
  {
    q: "Is Free really free?",
    a: "Yes. The whole core game — quests, goals, skills, projects, journal, challenges and community — stays free. Paid plans add room, history and AI on top.",
  },
  {
    q: "When do Pro and Premium launch?",
    a: "Soon. Payments aren't switched on yet, so nothing can be bought today and nothing is ever charged without you choosing it. Tap “Notify me” and you'll hear first.",
  },
  {
    q: "What happens to my progress if I upgrade later?",
    a: "Everything carries over. Your XP, skills, goals and history belong to your account, whatever the plan.",
  },
  {
    q: "What if I'm over a Free limit?",
    a: "Nothing is ever deleted. You just can't start another goal or project until one is completed or archived.",
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <CheckIcon className="mx-auto size-4 text-emerald-300" aria-label="Included" />;
  if (value === false) return <MinusIcon className="mx-auto size-4 text-muted-foreground/50" aria-label="Not included" />;
  return <span className="text-sm font-medium">{value}</span>;
}

export default async function PlansPage() {
  await connection();
  const user = await getCurrentUser();
  const { plan, interests } = await getPlanOverview(user);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Plans"
        title="Grow at your own pace"
        description="AROHA is free to play. Pro and Premium are coming soon — payments aren't live, so nothing is charged today."
        actions={<PlanBadge tier={plan} label={`You're on ${PLANS[plan].name}`} className="px-3 py-1 text-xs" />}
      />

      <ul className="grid gap-4 lg:grid-cols-3">
        {PLAN_TIERS.map((tier) => {
          const info = PLANS[tier];
          const style = PLAN_STYLE[tier];
          const Icon = style.icon;
          const current = tier === plan;
          return (
            <li key={tier} className={cn("relative flex flex-col gap-5 rounded-3xl border bg-card p-6", current && "ring-2 ring-primary/60")}>
              {!info.available && (
                <span className="absolute top-5 right-5 rounded-full bg-foreground/90 px-2.5 py-0.5 text-[11px] font-semibold text-background">
                  Coming soon
                </span>
              )}
              <div className="space-y-3">
                <span className={cn("grid size-11 place-items-center rounded-xl border bg-background/50", style.accent)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{info.name}</h2>
                  <p className="text-sm text-muted-foreground">{info.tagline}</p>
                </div>
                <p className="text-3xl font-semibold tracking-tight whitespace-nowrap">
                  {info.price ?? <span className="text-2xl">Coming soon</span>}
                  {tier === "FREE" && <span className="ml-1.5 text-sm font-normal text-muted-foreground">forever</span>}
                </p>
              </div>

              <ul className="flex-1 space-y-2">
                {info.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2 text-sm">
                    <CheckIcon className={cn("mt-0.5 size-4 shrink-0", style.accent)} aria-hidden />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              {current ? (
                <Button type="button" variant="outline" className="w-full" disabled>
                  Your plan
                </Button>
              ) : tier === "FREE" ? (
                <p className="text-center text-xs text-muted-foreground">Included with every account</p>
              ) : (
                <PlanInterestButton tier={tier} interested={interests.includes(tier)} />
              )}
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="compare-title" className="space-y-3">
        <h2 id="compare-title" className="text-lg font-semibold">
          Compare plans
        </h2>
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b">
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Feature
                </th>
                {PLAN_TIERS.map((tier) => (
                  <th key={tier} scope="col" className="w-28 px-2 py-3 text-center">
                    <PlanBadge tier={tier} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal">
                    {row.label}
                  </th>
                  {PLAN_TIERS.map((tier) => (
                    <td key={tier} className="px-2 py-2.5 text-center">
                      <CellValue value={row.values[tier]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="space-y-3">
        <h2 id="faq-title" className="text-lg font-semibold">
          Questions
        </h2>
        <div className="divide-y rounded-2xl border bg-card">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                <span className="mr-2 inline-block text-primary transition-transform group-open:rotate-90">›</span>
                {item.q}
              </summary>
              <p className="mt-2 pl-4 text-sm text-pretty text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
