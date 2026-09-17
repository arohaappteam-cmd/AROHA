import { ClipboardCheckIcon, IdCardIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { SkillHistoryCard } from "@/components/skills/skill-history-card";
import { SkillTreeCard } from "@/components/skills/skill-tree-card";
import { SkillsSummary } from "@/components/skills/skills-summary";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";
import { getSkillsOverview } from "@/server/services/skill.service";

export const metadata: Metadata = { title: "Skills" };

export default async function SkillsPage() {
  await connection();
  const user = await getCurrentUser();
  const overview = await getSkillsOverview(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Skills"
        title="What you're becoming capable of"
        description="Real quests feed real skills. Each tree shows what you know, what you're learning, and what opens up next. Mastery takes proof, not just practice."
        actions={
          <>
            <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
              <ClipboardCheckIcon data-icon="inline-start" />
              Assessments
            </Link>
            <Link href="/passport" className={buttonVariants({ variant: "ghost" })}>
              <IdCardIcon data-icon="inline-start" />
              Passport
            </Link>
          </>
        }
      />

      <SkillsSummary totals={overview.totals} />

      <ul className="grid gap-4 lg:grid-cols-2">
        {overview.trees.map((tree) => (
          <li key={tree.slug}>
            <SkillTreeCard tree={tree} />
          </li>
        ))}
      </ul>

      <SkillHistoryCard entries={overview.recent} />
    </div>
  );
}
