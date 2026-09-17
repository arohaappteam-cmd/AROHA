import { FolderKanbanIcon } from "lucide-react";
import Link from "next/link";

import { EvaluatorBadge, ProofTierBadge } from "@/components/proof/proof-badges";
import { cn } from "@/lib/utils";
import { ASSESSMENT_KIND_LABEL } from "@/modules/assessments/grading";
import type { PassportSkill } from "@/server/services/passport.service";

const TIER_DOT = {
  NONE: "bg-muted-foreground/30",
  PRACTICED: "bg-sky-500",
  TESTED: "bg-violet-500",
  DEMONSTRATED: "bg-emerald-500",
  MASTERED: "bg-amber-500",
} as const;

/** Every skill with activity, strongest proof first — and what backs it up. */
export function SkillLedger({ skills }: { skills: PassportSkill[] }) {
  if (skills.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        No skills on record yet. Complete quests to practise, then prove what you can do with{" "}
        <Link href="/projects" className="text-primary hover:underline">
          projects
        </Link>{" "}
        and{" "}
        <Link href="/assessments" className="text-primary hover:underline">
          assessments
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {skills.map((skill) => (
        <li key={skill.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="mt-0.5 text-xl" aria-hidden>
              {skill.tree.emoji}
            </span>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/skills/${skill.tree.slug}`} className="font-medium hover:underline">
                  {skill.name}
                </Link>
                <ProofTierBadge tier={skill.tier} />
              </div>
              <p className="text-xs text-muted-foreground">{skill.tree.name}</p>
              {(skill.assessments.length > 0 || skill.projects.length > 0) && (
                <ul className="flex flex-wrap gap-1.5 pt-0.5">
                  {skill.assessments.map((assessment) => (
                    <li key={assessment.title} className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 text-xs">
                      <span className="font-medium">{ASSESSMENT_KIND_LABEL[assessment.kind]}</span>
                      <span className="tabular-nums">{assessment.percent}%</span>
                      <EvaluatorBadge evaluator={assessment.evaluator} />
                    </li>
                  ))}
                  {skill.projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1 text-xs hover:bg-muted"
                      >
                        <FolderKanbanIcon className="size-3" aria-hidden />
                        {project.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 pl-9 sm:flex-col sm:items-end sm:gap-1.5 sm:pl-0">
            <span className="flex gap-1" title={`Level ${skill.level} of ${skill.maxLevel}`} aria-label={`Level ${skill.level} of ${skill.maxLevel}`}>
              {Array.from({ length: skill.maxLevel }, (_, index) => (
                <span key={index} className={cn("h-2 w-4 rounded-full", index < skill.level ? TIER_DOT[skill.tier] : "bg-muted")} />
              ))}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              Lv {skill.level}/{skill.maxLevel} · {skill.levelLabel}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
