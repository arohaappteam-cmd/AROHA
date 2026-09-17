import { PartyPopperIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { SetupChecklist } from "@/components/character/setup-checklist";
import { AttributesCard } from "@/components/dashboard/attributes-card";
import { JourneySummary } from "@/components/dashboard/journey-summary";
import { LevelCard } from "@/components/dashboard/level-card";
import { JourneyHeader } from "@/components/quests/journey-header";
import { JourneyPath } from "@/components/quests/journey-path";
import { QuestCard } from "@/components/quests/quest-card";
import { EveningReflectionCard } from "@/components/reflection/evening-reflection-card";
import { ShadowDebtCard } from "@/components/shadow/shadow-debt-card";
import { greetingFor, hourInTimezone } from "@/modules/identity/timezones";
import { getDashboardData } from "@/server/services/dashboard.service";
import { getTodayJourney } from "@/server/services/quest-view.service";
import { getReflectionDay } from "@/server/services/reflection.service";
import { getShadowDebt } from "@/server/services/shadow.service";

export default async function TodayPage() {
  // Per-user, per-request data: never prerender at build time.
  await connection();
  // The journey first: it may generate today's quests (and expire past ones),
  // which the dashboard and shadow debt read.
  const journey = await getTodayJourney();
  const data = await getDashboardData();
  const [shadowDebt, reflectionDay] = await Promise.all([getShadowDebt(data.user), getReflectionDay(data.user)]);
  const hour = hourInTimezone(new Date(), data.user.timezone);
  const greeting = greetingFor(hour);
  const experimentQuests = journey.bonus.filter((quest) => quest.payload?.kind === "experiment");
  const sideQuests = journey.bonus.filter((quest) => quest.payload?.kind !== "experiment");

  return (
    <div className="space-y-8">
      <JourneyHeader
        journey={journey}
        greeting={greeting}
        name={data.user.displayName}
        appearance={data.appearance}
        tier={data.progress.tier}
      />

      {journey.progress.allCoreCompleted && (
        <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
          <PartyPopperIcon className="mt-0.5 size-6 shrink-0 text-emerald-500" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Every quest complete.</p>
            <p className="text-sm text-muted-foreground">
              You moved, cleared your mind, learned, connected and moved your goal forward. Add a reflection to any quest to
              remember what today taught you.
            </p>
          </div>
        </div>
      )}

      <SetupChecklist setup={data.setup} title="Help AROHA shape better quests for you" />

      <ShadowDebtCard debt={shadowDebt} />

      <section aria-labelledby="path-title" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="path-title" className="text-lg font-semibold">
            Your quests
          </h2>
          <p className="text-xs text-muted-foreground">Open AROHA · live your day · come back to record it</p>
        </div>
        <JourneyPath quests={journey.core} xpAwarded={journey.xpAwarded} />
      </section>

      {experimentQuests.length > 0 && (
        <section aria-labelledby="experiment-title" className="space-y-3">
          <div>
            <h2 id="experiment-title" className="text-lg font-semibold">
              Experiment practice
            </h2>
            <p className="text-sm text-muted-foreground">
              A short try-out from{" "}
              <Link href="/discover" className="text-primary hover:underline">
                your experiment
              </Link>
              . No pressure to be good at it — just notice whether you like it.
            </p>
          </div>
          {experimentQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} xpAwarded={journey.xpAwarded} compact />
          ))}
        </section>
      )}

      {sideQuests.length > 0 && (
        <section aria-labelledby="side-title" className="space-y-3">
          <div>
            <h2 id="side-title" className="text-lg font-semibold">
              Side quest
            </h2>
            <p className="text-sm text-muted-foreground">Optional. For the areas you&apos;re focusing on, if the day has room.</p>
          </div>
          {sideQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} xpAwarded={journey.xpAwarded} compact />
          ))}
        </section>
      )}

      <EveningReflectionCard
        reflection={reflectionDay.reflection}
        prominent={journey.progress.allCoreCompleted || hour >= 17}
        coreCompleted={journey.progress.coreCompleted}
        coreTotal={journey.progress.coreTotal}
      />

      <section aria-labelledby="character-title" className="space-y-4">
        <h2 id="character-title" className="text-lg font-semibold">
          Your character
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <LevelCard progress={data.progress} />
          <AttributesCard attributes={data.attributes} />
        </div>
        <JourneySummary data={data} />
      </section>
    </div>
  );
}
