import { ArrowRightIcon, CheckCircle2Icon, EyeIcon, LightbulbIcon, TargetIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MentorInsights } from "@/modules/mentor/types";

/** Only in-app paths are followed; anything else the model suggests is shown as plain text. */
function safeHref(href: string | null): string | null {
  return href && href.startsWith("/") && !href.startsWith("//") ? href : null;
}

export function AnalysisCard({ analysis }: { analysis: MentorInsights["analysis"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it&apos;s going</CardTitle>
        <CardDescription>{analysis.summary}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-emerald-600 uppercase dark:text-emerald-300">
            <CheckCircle2Icon className="size-3.5" aria-hidden />
            Going well
          </p>
          {analysis.wins.length ? (
            <ul className="space-y-1.5 text-sm">
              {analysis.wins.map((win) => (
                <li key={win} className="flex gap-2">
                  <span aria-hidden className="text-emerald-500">
                    ·
                  </span>
                  {win}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Your first completed quests will show up here.</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-amber-600 uppercase dark:text-amber-300">
            <EyeIcon className="size-3.5" aria-hidden />
            Worth a look
          </p>
          {analysis.watchOuts.length ? (
            <ul className="space-y-1.5 text-sm">
              {analysis.watchOuts.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-amber-500">
                    ·
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecommendationsCard({ recommendations }: { recommendations: MentorInsights["recommendations"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightbulbIcon className="size-4 text-primary" aria-hidden />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {recommendations.map((rec) => {
            const href = safeHref(rec.href);
            return (
              <li key={rec.title} className="rounded-xl border p-4">
                <p className="font-medium">{rec.title}</p>
                <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{rec.detail}</p>
                {href && (
                  <Link href={href} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}>
                    {rec.actionLabel ?? "Open"}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export function SkillGapCard({ skillGaps }: { skillGaps: MentorInsights["skillGaps"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WrenchIcon className="size-4 text-muted-foreground" aria-hidden />
          Skills to build next
        </CardTitle>
      </CardHeader>
      <CardContent>
        {skillGaps.length ? (
          <ul className="space-y-3">
            {skillGaps.map((gap) => (
              <li key={gap.label}>
                <p className="text-sm font-medium">{gap.label}</p>
                <p className="text-sm text-pretty text-muted-foreground">{gap.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={TargetIcon}
            title="No goals to analyse yet"
            description="Set a goal and the mentor will map the capabilities worth building next."
            action={
              <Link href="/goals/new" className={buttonVariants({ size: "sm" })}>
                Create a goal
              </Link>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

export function GoalGuidanceCard({ guidance }: { guidance: NonNullable<MentorInsights["goalGuidance"]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TargetIcon className="size-4 text-primary" aria-hidden />
          Guidance on your major goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-pretty">{guidance.guidance}</p>
        {guidance.nextActions.length > 0 && (
          <ol className="space-y-2">
            {guidance.nextActions.map((action, index) => (
              <li key={action} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <span className="pt-0.5">{action}</span>
              </li>
            ))}
          </ol>
        )}
        <Link href={`/goals/${guidance.goalId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open goal
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </CardContent>
    </Card>
  );
}
