import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { SkillHistoryCard } from "@/components/skills/skill-history-card";
import { SkillTreeExplorer } from "@/components/skills/skill-tree-explorer";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { findTreeSpec } from "@/modules/skills/catalogue";
import { getCurrentUser } from "@/server/auth/current-user";
import { getSkillTreeDetail } from "@/server/services/skill.service";
import { Glyph } from "@/components/common/glyph";

export async function generateMetadata(props: PageProps<"/skills/[treeSlug]">): Promise<Metadata> {
  const { treeSlug } = await props.params;
  return { title: findTreeSpec(treeSlug)?.name ?? "Skill tree" };
}

export default async function SkillTreePage(props: PageProps<"/skills/[treeSlug]">) {
  const { treeSlug } = await props.params;
  const user = await getCurrentUser();
  const detail = await getSkillTreeDetail(user.id, treeSlug);
  if (!detail) notFound();

  const { tree, summary } = detail;
  const stats = [
    { label: "Mastered", value: summary.mastered },
    { label: "Learning", value: summary.learning },
    { label: "Ready to start", value: summary.available },
    { label: "Locked", value: summary.locked },
    { label: "Tree XP", value: new Intl.NumberFormat("en").format(summary.xp) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Skill tree"
        title={
          <span className="flex items-center gap-2.5">
            <span aria-hidden><Glyph emoji={tree.emoji} /></span>
            {tree.name}
          </span>
        }
        description={tree.description}
        actions={
          <Link href="/skills" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeftIcon data-icon="inline-start" />
            All skills
          </Link>
        }
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardContent>
          <SkillTreeExplorer nodes={detail.nodes} />
        </CardContent>
      </Card>

      <SkillHistoryCard entries={detail.history} scoped />
    </div>
  );
}
