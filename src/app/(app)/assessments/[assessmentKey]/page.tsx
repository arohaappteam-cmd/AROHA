import { ArrowLeftIcon, BadgeCheckIcon, ClockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { QuizForm } from "@/components/assessments/quiz-form";
import { RubricForm } from "@/components/assessments/rubric-form";
import { EvaluatorBadge } from "@/components/proof/proof-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ASSESSMENT_KIND_LABEL } from "@/modules/assessments/grading";
import { isRealAIConfigured } from "@/server/ai";
import { getCurrentUser } from "@/server/auth/current-user";
import { getAssessmentToTake } from "@/server/services/assessment.service";
import { Glyph } from "@/components/common/glyph";

export const metadata: Metadata = { title: "Assessment" };

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

export default async function AssessmentPage(props: PageProps<"/assessments/[assessmentKey]">) {
  await connection();
  const { assessmentKey } = await props.params;
  const user = await getCurrentUser();
  const data = await getAssessmentToTake(user.id, decodeURIComponent(assessmentKey));
  if (!data) notFound();

  const { definition, skill } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/assessments" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        All assessments
      </Link>

      <header className="space-y-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium tracking-[0.18em] text-primary uppercase">
          {ASSESSMENT_KIND_LABEL[definition.kind]}
          <Link href={`/skills/${skill.tree.slug}`} className="tracking-normal text-muted-foreground normal-case hover:underline">
            <span aria-hidden><Glyph emoji={skill.tree.emoji} /></span> {skill.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{definition.title}</h1>
        <p className="text-sm text-muted-foreground">{definition.summary}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClockIcon className="size-3" aria-hidden />
            About {definition.minutes} minutes
          </span>
          <span>Passes at {definition.passPercent}%</span>
          <span>Retake any time — only the first pass pays XP</span>
        </p>
        {data.passed && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-300">
            <BadgeCheckIcon className="size-4" aria-hidden />
            You&apos;ve passed this. Retaking is welcome, but won&apos;t pay again.
          </p>
        )}
      </header>

      {definition.kind !== "QUIZ" && (
        <Card>
          <CardHeader>
            <CardTitle>The task</CardTitle>
            <CardDescription className="text-sm whitespace-pre-line text-foreground/90">{definition.brief}</CardDescription>
          </CardHeader>
          {definition.kind === "PRACTICAL" && (
            <CardContent>
              <p className="text-sm">
                <span className="font-medium">Hand in:</span> <span className="text-muted-foreground">{definition.deliverable}</span>
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {definition.kind === "QUIZ" ? (
        <QuizForm assessmentKey={definition.key} questions={definition.questions} />
      ) : (
        <RubricForm
          kind={definition.kind}
          assessmentKey={definition.key}
          criteria={definition.criteria}
          deliverable={definition.kind === "PRACTICAL" ? definition.deliverable : undefined}
          projects={data.projects}
          aiAvailable={isRealAIConfigured()}
        />
      )}

      {data.attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="divide-y">
              {data.attempts.map((attempt) => (
                <li key={attempt.id}>
                  <Link href={`/assessments/attempts/${attempt.id}`} className="flex items-center gap-3 py-2 hover:bg-muted/30">
                    <span className="flex-1 text-sm">{dateFormat.format(attempt.createdAt)}</span>
                    <EvaluatorBadge evaluator={attempt.evaluator} />
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
      )}
    </div>
  );
}
