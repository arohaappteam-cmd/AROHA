import type { Metadata } from "next";
import { connection } from "next/server";

import { AchievementGrid } from "@/components/achievements/achievement-grid";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { StartChallenges } from "@/components/challenges/start-challenges";
import { PageHeader } from "@/components/common/page-header";
import { JourneyTabs } from "@/components/journey/journey-tabs";
import { StreakCards } from "@/components/streaks/streak-cards";
import { getCurrentUser } from "@/server/auth/current-user";
import { getAchievementsView } from "@/server/services/achievement.service";
import { getChallengesOverview } from "@/server/services/challenge.service";
import { getStreaks } from "@/server/services/streak.service";

export const metadata: Metadata = { title: "Journey" };

export default async function JourneyPage() {
  await connection();
  const user = await getCurrentUser();
  const [challenges, streaks, achievements] = await Promise.all([
    getChallengesOverview(user),
    getStreaks(user),
    getAchievementsView(user.id),
  ]);

  const unlockedCount = achievements.filter((achievement) => achievement.unlockedAt !== null).length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Journey"
        title="The record of showing up"
        description="Challenges you take on, consistency you build, milestones you earn. All of it from real completed quests."
      />
      <JourneyTabs active="/journey" />

      <section aria-labelledby="challenges-title" className="space-y-4">
        <div>
          <h2 id="challenges-title" className="text-lg font-semibold">
            Challenges
          </h2>
          <p className="text-sm text-muted-foreground">
            Temporary commitments with built-in grace days — completing matching quests earns the days.
          </p>
        </div>
        {challenges.active.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            {challenges.active.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}
        <StartChallenges templates={challenges.available} canStart={challenges.canStart} />
        {challenges.past.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
              Past challenges ({challenges.past.length})
            </summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {challenges.past.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </details>
        )}
      </section>

      <section aria-labelledby="streaks-title" className="space-y-4">
        <div>
          <h2 id="streaks-title" className="text-lg font-semibold">
            Streaks
          </h2>
          <p className="text-sm text-muted-foreground">Secondary by design — progress is primary.</p>
        </div>
        <StreakCards streaks={streaks} />
      </section>

      <section aria-labelledby="achievements-title" className="space-y-4">
        <div>
          <h2 id="achievements-title" className="text-lg font-semibold">
            Achievements
          </h2>
          <p className="text-sm text-muted-foreground">
            {unlockedCount} of {achievements.length} unlocked. Checked automatically from what you actually do — and never taken away.
          </p>
        </div>
        <AchievementGrid achievements={achievements} />
      </section>
    </div>
  );
}
