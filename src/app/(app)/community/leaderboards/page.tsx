import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs, DemoNotice } from "@/components/social/community-chrome";
import { BoardChooser, LeaderboardTable } from "@/components/social/leaderboard";
import { SelfComparisonCard } from "@/components/social/self-comparison";
import { resolveMetric } from "@/modules/social/leaderboards";
import { getCurrentUser } from "@/server/auth/current-user";
import { getLeaderboards } from "@/server/services/social.service";

export const metadata: Metadata = { title: "Leaderboards" };

export default async function LeaderboardsPage(props: PageProps<"/community/leaderboards">) {
  await connection();
  const { board, guild } = await props.searchParams;
  const metric = resolveMetric(board);
  const user = await getCurrentUser();
  const view = await getLeaderboards(user, metric, typeof guild === "string" ? guild : null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="Your progress, and optionally everyone else's"
        description="AROHA measures you against your own previous month. Leaderboards exist because some people find them motivating — they are optional to appear on and optional to look at."
      />
      <CommunityTabs active="/community/leaderboards" />
      <DemoNotice kind={view.directoryKind} />

      <SelfComparisonCard comparison={view.comparison} compact />

      <section aria-labelledby="boards-title" className="space-y-4">
        <div className="space-y-1">
          <h2 id="boards-title" className="text-lg font-semibold">
            Community leaderboards
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Pick a board to open it. Nothing is ranked until you ask — and nobody is listed who hasn&apos;t opted in.
          </p>
        </div>

        <BoardChooser metric={view.metric} guild={view.guild} guilds={view.guilds} />

        {view.metric ? (
          <LeaderboardTable metric={view.metric} rows={view.rows} guild={view.guild} onLeaderboards={view.onLeaderboards} />
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No board is open. The comparison above is the one AROHA thinks is worth your attention.
          </p>
        )}
      </section>
    </div>
  );
}
