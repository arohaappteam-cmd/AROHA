import type { Metadata } from "next";
import { connection } from "next/server";

import { AchievementProgress } from "@/components/journey/achievement-progress";
import { ActivityHeatmap } from "@/components/journey/activity-heatmap";
import { CharacterProgress } from "@/components/journey/character-progress";
import { EnergyMap } from "@/components/journey/energy-map";
import { GoalProgress } from "@/components/journey/goal-progress";
import { HudPanel } from "@/components/journey/hud";
import { JourneyBeginning, RangeFilter, SectionNav } from "@/components/journey/journey-chrome";
import { JourneyHero } from "@/components/journey/journey-hero";
import { JourneyTabs } from "@/components/journey/journey-tabs";
import { LifeAreaProgress } from "@/components/journey/life-area-progress";
import { MonthlyReview } from "@/components/journey/monthly-review";
import { QuestActivityGrid } from "@/components/journey/quest-activity-grid";
import { SkillProgress } from "@/components/journey/skill-progress";
import { WeeklyProgressRings } from "@/components/journey/weekly-progress-rings";
import { WeeklyReview } from "@/components/journey/weekly-review";
import { XpProgressChart } from "@/components/journey/xp-progress-chart";
import { YearlyJourney } from "@/components/journey/yearly-journey";
import { resolveJourneyRange } from "@/modules/journey/calendar";
import { getCurrentUser } from "@/server/auth/current-user";
import { getJourney } from "@/server/services/journey.service";

export const metadata: Metadata = { title: "Journey" };

/**
 * The progression map: the user's real record of quests, XP, goals, skills
 * and achievements, from this week out to the whole year.
 */
export default async function JourneyPage(props: PageProps<"/journey">) {
  await connection();
  const params = await props.searchParams;
  const user = await getCurrentUser();
  const journey = await getJourney(user, {
    range: resolveJourneyRange(params.range),
    year: typeof params.year === "string" ? params.year : undefined,
  });
  const hasPrevious = journey.range.previous !== null;

  return (
    <div className="space-y-6">
      <JourneyHero journey={journey} />
      <JourneyTabs active="/journey" />
      {!journey.hasHistory && <JourneyBeginning />}
      <SectionNav />

      <WeeklyProgressRings label={journey.month.label} weeks={journey.month.weeks} />

      <section id="trends" aria-label="Trends" className="scroll-mt-28 space-y-4">
        <RangeFilter active={journey.range.key} year={journey.year.year} />

        <HudPanel id="xp" index="02" label="XP progression" title="Experience earned" description="Every point comes from something you did — quests, goals, projects, challenges and achievements.">
          <XpProgressChart xp={journey.xp} rangeLabel={journey.range.label.toLowerCase()} />
        </HudPanel>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <HudPanel id="areas" index="03" label="Life areas" title="How each area is going">
            <LifeAreaProgress areas={journey.areas} hasPrevious={hasPrevious} />
          </HudPanel>
          <HudPanel id="energy" index="04" label="Energy map" title="Where your effort goes">
            <EnergyMap areas={journey.areas.core} hasPrevious={hasPrevious} />
          </HudPanel>
        </div>
      </section>

      <HudPanel id="quest-log" index="05" label="Quest log" title="Daily quest activity" description="Every day of the last twelve weeks, by life area. Tap a day to see its quests.">
        <QuestActivityGrid grid={journey.activity} />
      </HudPanel>

      <HudPanel id="consistency" index="06" label="Consistency" title="Showing up, day by day" description="The last twelve months. Stronger squares mean more quests completed that day.">
        <ActivityHeatmap heatmap={journey.heatmap} />
      </HudPanel>

      <HudPanel id="goals" index="07" label="Goals" title="Roadmaps in motion">
        <GoalProgress goals={journey.goals} />
      </HudPanel>

      <HudPanel id="skills" index="08" label="Skills" title="What you're becoming capable of">
        <SkillProgress skills={journey.skills} />
      </HudPanel>

      <HudPanel id="week" index="09" label="Weekly review" title="Your week">
        <WeeklyReview review={journey.week} />
      </HudPanel>

      <HudPanel id="month-review" index="10" label="Monthly progression" title={journey.monthReview.label}>
        <MonthlyReview review={journey.monthReview} />
      </HudPanel>

      <HudPanel id="year" index="11" label="The year" title={`${journey.year.year} at a glance`}>
        <YearlyJourney year={journey.year} range={journey.range.key} />
      </HudPanel>

      <HudPanel id="character" index="12" label="Character" title="How you got here" description="Tiers are reached through XP from real actions. The day each was first reached stays on the record.">
        <CharacterProgress character={journey.character} />
      </HudPanel>

      <HudPanel id="achievements" index="13" label="Achievements" title="Milestones earned">
        <AchievementProgress achievements={journey.achievements} />
      </HudPanel>
    </div>
  );
}
