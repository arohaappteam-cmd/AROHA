import { ClipboardCheckIcon, FolderKanbanIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { MasteryAreas } from "@/components/passport/mastery-areas";
import { PassportHero } from "@/components/passport/passport-hero";
import {
  AchievementStrip,
  AssessmentRecord,
  ChallengesAndExperiences,
  MilestoneTimeline,
  ProjectsGallery,
  ProofWall,
  SectionHeading,
} from "@/components/passport/passport-sections";
import { SkillLedger } from "@/components/passport/skill-ledger";
import { ProofTierBadge } from "@/components/proof/proof-badges";
import { buttonVariants } from "@/components/ui/button";
import { PROOF_TIER_META, PROOF_TIER_ORDER } from "@/modules/proof/tiers";
import { getCurrentUser } from "@/server/auth/current-user";
import { getSkillPassport } from "@/server/services/passport.service";

export const metadata: Metadata = { title: "Skill Passport" };

export default async function PassportPage() {
  await connection();
  const user = await getCurrentUser();
  const passport = await getSkillPassport();

  return (
    <div className="space-y-12">
      <PassportHero passport={passport} seed={user.id} />

      {passport.masteryAreas.length > 0 && (
        <section aria-labelledby="mastery-title" className="space-y-4">
          <SectionHeading
            id="mastery-title"
            title="Mastery areas"
            description="Where your capability runs deepest. Green shows proven skills; the lighter ring shows skills in practice."
          />
          <MasteryAreas areas={passport.masteryAreas} />
        </section>
      )}

      <section aria-labelledby="skills-title" className="space-y-4">
        <SectionHeading
          id="skills-title"
          title="Skills"
          description="Strongest proof first. Levels come from practice; the badge shows what has actually been demonstrated."
        />
        <details className="rounded-xl bg-muted/30 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">How proof levels work</summary>
          <ul className="mt-3 space-y-2">
            {PROOF_TIER_ORDER.filter((tier) => tier !== "NONE").map((tier) => (
              <li key={tier} className="flex flex-wrap items-center gap-2">
                <ProofTierBadge tier={tier} />
                <span className="text-muted-foreground">{PROOF_TIER_META[tier].description}</span>
              </li>
            ))}
          </ul>
        </details>
        <SkillLedger skills={passport.skills} />
      </section>

      <section aria-labelledby="proof-title" className="space-y-4">
        <SectionHeading
          id="proof-title"
          title="Proof of skill"
          description="“I have demonstrated this” — not “I say I know this”. Every item links to real work."
        />
        <ProofWall proof={passport.proof} />
      </section>

      <section aria-labelledby="projects-title" className="space-y-4">
        <SectionHeading
          id="projects-title"
          title="Projects"
          description="Things built, written, recorded and made."
          action={
            <Link href="/projects" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <FolderKanbanIcon data-icon="inline-start" />
              All projects
            </Link>
          }
        />
        <ProjectsGallery projects={passport.projects} />
      </section>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
        <section aria-labelledby="assessments-title" className="space-y-4">
          <SectionHeading
            id="assessments-title"
            title="Assessments passed"
            description="Each result says who evaluated it."
            action={
              <Link href="/assessments" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <ClipboardCheckIcon data-icon="inline-start" />
                Take one
              </Link>
            }
          />
          <AssessmentRecord assessments={passport.assessments} />
        </section>

        <section aria-labelledby="milestones-title" className="space-y-4">
          <SectionHeading id="milestones-title" title="Milestones" description="The moments this record was built from." />
          <MilestoneTimeline milestones={passport.milestones} />
        </section>
      </div>

      <section aria-labelledby="achievements-title" className="space-y-4">
        <SectionHeading id="achievements-title" title="Achievements" description="Earned automatically, kept forever." />
        <AchievementStrip achievements={passport.achievements} />
      </section>

      <section aria-labelledby="journey-title" className="space-y-4">
        <SectionHeading id="journey-title" title="Challenges & experiences" />
        <ChallengesAndExperiences challenges={passport.challenges} experiences={passport.experiences} />
      </section>
    </div>
  );
}
