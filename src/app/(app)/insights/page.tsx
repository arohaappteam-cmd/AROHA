import { ChartLineIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { InsightReportSkeleton, InsightReportView } from "@/components/insights/insight-report";
import { ChallengeProgressCard, GoalProgressCard, SkillProgressCard } from "@/components/insights/progress-cards";
import { RangeTabs } from "@/components/insights/range-tabs";
import { LifeAreaCard, QuestTrendCard, StatTotals, XpTrendCard } from "@/components/insights/trend-cards";
import { buttonVariants } from "@/components/ui/button";
import { resolveRange } from "@/modules/analytics/dataset";
import { getCurrentUser } from "@/server/auth/current-user";
import { getAnalytics, getInsightReport, type Analytics } from "@/server/services/analytics.service";

export const metadata: Metadata = { title: "Insights" };

/** Streams in after the charts, so a slow model call never holds up the page. */
async function InsightReportSection({ analytics }: { analytics: Analytics }) {
  const report = await getInsightReport(analytics);
  return <InsightReportView report={report} source={report.source} enoughHistory={analytics.enoughHistory} />;
}

export default async function InsightsPage(props: PageProps<"/insights">) {
  await connection();
  const { range: rangeParam } = await props.searchParams;
  const range = resolveRange(rangeParam);
  const user = await getCurrentUser();
  const analytics = await getAnalytics(user, range);
  const { overview } = analytics;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Your trends and patterns"
        description="Counts from your own quests, goals and skills. They show how your days have been going — they aren't measurements of your health or ability."
        actions={<RangeTabs active={range} />}
      />

      {!overview.hasActivity ? (
        <EmptyState
          icon={ChartLineIcon}
          title="Nothing to chart yet"
          description="Complete a few quests and your trends, balance and patterns will start to take shape here."
          action={
            <Link href="/" className={buttonVariants({ size: "sm" })}>
              Today&apos;s journey
            </Link>
          }
        />
      ) : (
        <>
          <Suspense fallback={<InsightReportSkeleton />}>
            <InsightReportSection analytics={analytics} />
          </Suspense>

          <StatTotals overview={overview} />
          <LifeAreaCard overview={overview} />

          <div className="grid gap-6 lg:grid-cols-2">
            <QuestTrendCard overview={overview} />
            <XpTrendCard overview={overview} />
          </div>

          <GoalProgressCard overview={overview} />

          <div className="grid gap-6 lg:grid-cols-2">
            <SkillProgressCard overview={overview} />
            <ChallengeProgressCard overview={overview} />
          </div>
        </>
      )}
    </div>
  );
}
