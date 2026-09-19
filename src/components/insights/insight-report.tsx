import { ArrowRightIcon, CheckCircle2Icon, EyeIcon, LightbulbIcon, SparklesIcon, TelescopeIcon, WavesIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InsightReport } from "@/modules/analytics/insights";
import type { PatternTone } from "@/modules/analytics/patterns";

const TONE: Record<PatternTone, { icon: typeof CheckCircle2Icon; label: string; className: string }> = {
  strength: { icon: CheckCircle2Icon, label: "Going well", className: "text-emerald-600 dark:text-emerald-300" },
  shift: { icon: WavesIcon, label: "A pattern", className: "text-sky-600 dark:text-sky-300" },
  watch: { icon: EyeIcon, label: "Worth a look", className: "text-amber-600 dark:text-amber-300" },
};

export function InsightReportView({
  report,
  source,
  enoughHistory,
}: {
  report: InsightReport;
  source: "ai" | "fallback";
  enoughHistory: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TelescopeIcon className="size-4 text-primary" aria-hidden />
            What stands out
          </CardTitle>
          <CardDescription>
            {source === "ai"
              ? "Explained by your AI mentor from patterns in your record. The numbers underneath are AROHA's own counts."
              : "Patterns AROHA found in your last 12 weeks, with the numbers behind each one."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.insights.length === 0 ? (
            <EmptyState
              icon={SparklesIcon}
              title={enoughHistory ? "Nothing unusual right now" : "Not enough history yet"}
              description={
                enoughHistory
                  ? "Your activity has been steady — no shifts big enough to call out."
                  : "Patterns need a couple of weeks of completed quests. Keep going and they'll appear here."
              }
            />
          ) : (
            <ul className="space-y-4">
              {report.insights.map((insight) => {
                const tone = TONE[insight.tone];
                const Icon = tone.icon;
                return (
                  <li key={insight.title} className="flex gap-3">
                    <Icon className={`mt-0.5 size-4 shrink-0 ${tone.className}`} aria-label={tone.label} />
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-pretty">{insight.title}</p>
                      {insight.detail && <p className="text-sm text-pretty text-muted-foreground">{insight.detail}</p>}
                      {insight.evidence.map((line) => (
                        <p key={line} className="text-xs text-pretty text-muted-foreground">
                          {line}
                        </p>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightbulbIcon className="size-4 text-primary" aria-hidden />
            Worth trying
          </CardTitle>
          <CardDescription>Small changes that follow from what you&apos;ve been doing.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {report.recommendations.map((rec) => (
              <li key={rec.title} className="rounded-xl border p-3">
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{rec.detail}</p>
                {rec.href && (
                  <Link href={rec.href} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>
                    {rec.actionLabel ?? "Open"}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export function InsightReportSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-5" aria-busy="true" aria-label="Reading your patterns">
      <Skeleton className="h-64 rounded-xl lg:col-span-3" />
      <Skeleton className="h-64 rounded-xl lg:col-span-2" />
    </div>
  );
}
