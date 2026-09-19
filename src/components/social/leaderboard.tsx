import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LEADERBOARD_METRICS, metricMeta, type BoardRow, type LeaderboardMetric } from "@/modules/social/leaderboards";
import type { Guild } from "@/modules/social/types";

function href(metric: LeaderboardMetric | null, guildSlug: string | null): string {
  const params = new URLSearchParams();
  if (metric) params.set("board", metric);
  if (guildSlug) params.set("guild", guildSlug);
  const query = params.toString();
  return query ? `/community/leaderboards?${query}` : "/community/leaderboards";
}

/** Boards are opened deliberately: none is shown until one is chosen. */
export function BoardChooser({
  metric,
  guild,
  guilds,
}: {
  metric: LeaderboardMetric | null;
  guild: Guild | null;
  guilds: Guild[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {LEADERBOARD_METRICS.map((entry) => (
          <Link
            key={entry.key}
            href={href(entry.key === metric ? null : entry.key, guild?.slug ?? null)}
            aria-current={entry.key === metric ? "true" : undefined}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              entry.key === metric ? "border-primary bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {entry.label}
          </Link>
        ))}
      </div>
      {metric && guilds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">Among</span>
          <Link
            href={href(metric, null)}
            className={cn("rounded-lg border px-2.5 py-1 text-xs", guild === null ? "border-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
          >
            Everyone
          </Link>
          {guilds.map((entry) => (
            <Link
              key={entry.slug}
              href={href(metric, entry.slug)}
              className={cn("rounded-lg border px-2.5 py-1 text-xs", guild?.slug === entry.slug ? "border-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
            >
              {entry.emoji} {entry.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeaderboardTable({
  metric,
  rows,
  guild,
  onLeaderboards,
}: {
  metric: LeaderboardMetric;
  rows: BoardRow[];
  guild: Guild | null;
  onLeaderboards: boolean;
}) {
  const meta = metricMeta(metric);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.label}</CardTitle>
        <CardDescription>
          {meta.description} {guild ? `Among ${guild.name} members.` : "Among everyone in the community."} {meta.caption}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="divide-y">
          {rows.map((row) => (
            <li
              key={row.handle}
              className={cn("flex items-center gap-3 py-2 first:pt-0 last:pb-0", row.isViewer && "rounded-lg bg-primary/5 px-2")}
            >
              <span className="w-6 text-sm text-muted-foreground tabular-nums">{row.rank}</span>
              {row.isViewer ? (
                <span className="flex-1 truncate text-sm font-medium">{row.name} (you)</span>
              ) : (
                <Link href={`/community/people/${row.handle}`} className="flex-1 truncate text-sm underline-offset-4 hover:underline">
                  {row.name}
                </Link>
              )}
              <span className="text-sm font-medium tabular-nums">{row.display}</span>
            </li>
          ))}
        </ol>

        <p className="text-xs text-muted-foreground">
          {onLeaderboards ? (
            <>
              You appear here because you turned leaderboards on.{" "}
              <Link href="/community/profile" className="underline underline-offset-4">
                Turn them off
              </Link>{" "}
              any time.
            </>
          ) : (
            <>
              You aren&apos;t listed — leaderboards are off for your account.{" "}
              <Link href="/community/profile" className="underline underline-offset-4">
                Change that
              </Link>{" "}
              if you want to be included.
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
