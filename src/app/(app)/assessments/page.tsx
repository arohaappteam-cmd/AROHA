import { BadgeCheckIcon, BrainIcon, ClockIcon, HammerIcon, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { EvaluatorBadge } from "@/components/proof/proof-badges";
import { Card, CardContent } from "@/components/ui/card";
import type { AssessmentKind } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { ASSESSMENT_KIND_LABEL } from "@/modules/assessments/grading";
import { getCurrentUser } from "@/server/auth/current-user";
import { getAssessmentsOverview, type AssessmentListItem } from "@/server/services/assessment.service";
import { Glyph } from "@/components/common/glyph";

export const metadata: Metadata = { title: "Assessments" };

const SECTIONS: { kind: AssessmentKind; title: string; description: string; icon: LucideIcon }[] = [
  {
    kind: "PRACTICAL",
    title: "Practical tasks",
    description: "Do the thing, hand in the evidence. Shows ability — and can confirm mastery.",
    icon: HammerIcon,
  },
  {
    kind: "PROJECT",
    title: "Project reviews",
    description: "Have a finished project reviewed for a skill it used. Unlocks as you complete projects with evidence.",
    icon: BadgeCheckIcon,
  },
  {
    kind: "QUIZ",
    title: "Quizzes",
    description: "Check your understanding. Knowing about a skill counts — but it isn't the same as being able to do it.",
    icon: BrainIcon,
  },
];

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

function AssessmentCard({ item }: { item: AssessmentListItem }) {
  return (
    <Link href={`/assessments/${item.key}`} className="group block h-full">
      <Card size="sm" className={cn("h-full transition-colors group-hover:ring-primary/40", item.passed && "ring-emerald-500/40")}>
        <CardContent className="flex h-full flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              <span aria-hidden><Glyph emoji={item.tree.emoji} /></span> {item.skill.name}
            </span>
            {item.passed ? (
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-300">
                <BadgeCheckIcon className="size-3.5" aria-hidden />
                Passed · {item.bestPercent}%
              </span>
            ) : item.attempts > 0 ? (
              <span>Not yet · best {item.bestPercent}%</span>
            ) : null}
          </div>
          <p className="font-medium">{item.title}</p>
          <p className="flex-1 text-sm text-muted-foreground">{item.summary}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ClockIcon className="size-3" aria-hidden />
            About {item.minutes} min{item.kind === "PRACTICAL" ? " to write up, after doing the task" : ""}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function AssessmentsPage() {
  await connection();
  const user = await getCurrentUser();
  const overview = await getAssessmentsOverview(user.id);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Assessments"
        title="Show what you can do"
        description="Finishing lessons isn't mastery. Assessments turn practice into proof: quizzes check understanding, practical tasks and project reviews check ability."
      />

      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Assessments passed", value: overview.totals.passed },
          { label: "Ability demonstrated", value: overview.totals.abilityPassed },
          { label: "Attempts", value: overview.totals.attempts },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {SECTIONS.map((section) => {
        const items = overview.items.filter((item) => item.kind === section.kind);
        return (
          <section key={section.kind} aria-labelledby={`${section.kind}-title`} className="space-y-3">
            <div className="flex items-start gap-3">
              <section.icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 id={`${section.kind}-title`} className="text-lg font-semibold">
                  {section.title}
                </h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>
            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {section.kind === "PROJECT" ? (
                  <>
                    Complete a project with evidence and each skill it used can be reviewed here.{" "}
                    <Link href="/projects" className="text-primary hover:underline">
                      Go to Projects
                    </Link>
                  </>
                ) : (
                  "Nothing here yet."
                )}
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <li key={item.key}>
                    <AssessmentCard item={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {overview.recent.length > 0 && (
        <section aria-labelledby="recent-title" className="space-y-3">
          <h2 id="recent-title" className="text-lg font-semibold">
            Recent attempts
          </h2>
          <Card>
            <CardContent>
              <ol className="divide-y">
                {overview.recent.map((attempt) => (
                  <li key={attempt.id}>
                    <Link
                      href={`/assessments/attempts/${attempt.id}`}
                      className="flex items-center gap-3 py-2.5 hover:bg-muted/30"
                    >
                      <span aria-hidden><Glyph emoji={attempt.skill.tree.emoji} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{attempt.title}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {ASSESSMENT_KIND_LABEL[attempt.kind]} · {dateFormat.format(attempt.createdAt)}
                          <EvaluatorBadge evaluator={attempt.evaluator} />
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-medium tabular-nums",
                          attempt.outcome === "PASSED" ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground",
                        )}
                      >
                        {attempt.outcome === "PASSED" ? "Passed" : "Not yet"} · {attempt.percent}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
