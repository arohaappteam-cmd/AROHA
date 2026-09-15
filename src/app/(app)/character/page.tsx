import type { Metadata } from "next";
import { connection } from "next/server";

import { AboutCard } from "@/components/character/about-card";
import { CharacterHero } from "@/components/character/character-hero";
import { FocusAreasCard } from "@/components/character/focus-areas-card";
import { InterestsCard } from "@/components/character/interests-card";
import { LifeAreasOverview } from "@/components/character/life-areas-overview";
import { PreferencesSummary } from "@/components/character/preferences-summary";
import { ProgressionRecord } from "@/components/character/progression-record";
import { SetupChecklist } from "@/components/character/setup-checklist";
import { XpHistoryCard } from "@/components/character/xp-history-card";
import { AttributesCard } from "@/components/dashboard/attributes-card";
import { getCharacterSheet } from "@/server/services/character.service";

export const metadata: Metadata = { title: "Character" };

export default async function CharacterPage() {
  await connection();
  const sheet = await getCharacterSheet();

  return (
    <div className="space-y-6">
      <CharacterHero sheet={sheet} />
      <SetupChecklist setup={sheet.setup} />

      <div className="grid gap-6 lg:grid-cols-2">
        <FocusAreasCard focus={sheet.focus} />
        <AttributesCard attributes={sheet.attributes} />
      </div>

      <LifeAreasOverview areas={sheet.lifeAreas} />

      <XpHistoryCard entries={sheet.recentXp} />

      <div className="grid gap-6 lg:grid-cols-2">
        <InterestsCard interests={sheet.interests} />
        <PreferencesSummary preferences={sheet.preferences} />
      </div>

      <ProgressionRecord record={sheet.record} />
      <AboutCard bio={sheet.user.bio} />
    </div>
  );
}
