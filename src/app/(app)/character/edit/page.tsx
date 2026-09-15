import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AppearanceEditor } from "@/components/character/edit/appearance-editor";
import { EditorSection } from "@/components/character/edit/editor-section";
import { InterestsEditor } from "@/components/character/edit/interests-editor";
import { LifeAreasEditor, type LifeAreasEditorValue } from "@/components/character/edit/life-areas-editor";
import { PreferencesEditor } from "@/components/character/edit/preferences-editor";
import { ProfileEditor } from "@/components/character/edit/profile-editor";
import { PageHeader } from "@/components/common/page-header";
import { buttonVariants } from "@/components/ui/button";
import type { LifeArea } from "@/generated/prisma/enums";
import { MAX_FOCUS_AREAS } from "@/modules/identity/life-areas";
import { listTimezones } from "@/modules/identity/timezones";
import { getCharacterSheet } from "@/server/services/character.service";

export const metadata: Metadata = { title: "Customize character" };

const SECTIONS = [
  { id: "identity", label: "Identity" },
  { id: "avatar", label: "Avatar" },
  { id: "interests", label: "Interests" },
  { id: "life-areas", label: "Life areas" },
  { id: "preferences", label: "Preferences" },
] as const;

export default async function EditCharacterPage() {
  await connection();
  const sheet = await getCharacterSheet();
  const done = (key: string) => sheet.setup.steps.find((step) => step.key === key)?.done ?? false;

  const lifeAreasValue: LifeAreasEditorValue = {
    active: Object.fromEntries(sheet.lifeAreas.map((a) => [a.key, a.isActive])) as Record<LifeArea, boolean>,
    intentions: Object.fromEntries(sheet.lifeAreas.map((a) => [a.key, a.intention ?? ""])) as Record<LifeArea, string>,
    focus: sheet.focus.map((a) => a.key),
  };

  return (
    <div className="space-y-6">
      <Link href="/character" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        Character
      </Link>

      <PageHeader
        eyebrow="Customize"
        title="Shape your character"
        description="Everything here is yours to change at any time. AROHA uses it to understand you — not to judge you."
      />

      <nav aria-label="Sections" className="sticky top-14 z-30 -mx-4 overflow-x-auto border-b bg-background/85 px-4 py-2 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <ul className="flex gap-1">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <EditorSection id="identity" title="Identity" description="How AROHA addresses you and when your day begins.">
        <ProfileEditor
          everSaved={done("identity")}
          timezones={listTimezones()}
          initial={{
            displayName: sheet.user.displayName,
            pronouns: sheet.user.pronouns ?? "",
            bio: sheet.user.bio ?? "",
            timezone: sheet.user.timezone,
          }}
        />
      </EditorSection>

      <EditorSection
        id="avatar"
        title="Avatar"
        description="Choose how your character looks. Rings, glow and sparks are earned as you level up."
      >
        <AppearanceEditor
          everSaved={done("avatar")}
          name={sheet.user.displayName}
          tier={sheet.progress.tier}
          initial={{ ...sheet.character.appearance, motto: sheet.character.motto ?? "" }}
        />
      </EditorSection>

      <EditorSection
        id="interests"
        title="Interests"
        description="Anything you enjoy or want to explore. Changes save instantly."
      >
        <InterestsEditor interests={sheet.interests} defaultArea={sheet.focus[0]?.key ?? "PHYSICAL"} />
      </EditorSection>

      <EditorSection
        id="life-areas"
        title="Life areas & focus"
        description={`Turn on the areas that matter in your life, then star up to ${MAX_FOCUS_AREAS} to focus on right now. The five core areas are part of every balanced day.`}
      >
        <LifeAreasEditor initial={lifeAreasValue} />
      </EditorSection>

      <EditorSection
        id="preferences"
        title="Preferences"
        description="Help AROHA fit growth into your real life — your time, energy and circumstances."
      >
        <PreferencesEditor everSaved={sheet.preferences.saved} initial={{
          dailyMinutes: sheet.preferences.dailyMinutes,
          preferredTimeOfDay: sheet.preferences.preferredTimeOfDay,
          challengeLevel: sheet.preferences.challengeLevel,
          movementOptions: sheet.preferences.movementOptions,
          learningFormats: sheet.preferences.learningFormats,
        }} />
      </EditorSection>
    </div>
  );
}
