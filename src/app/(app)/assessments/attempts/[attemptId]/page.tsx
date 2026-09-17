import { ArrowLeftIcon, BadgeCheckIcon, CheckIcon, ExternalLinkIcon, RotateCcwIcon, SproutIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EvaluatorBadge } from "@/components/proof/proof-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ASSESSMENT_KIND_LABEL, confirmsAbility } from "@/modules/assessments/grading";
import { RUBRIC_MAX, RUBRIC_SCALE } from "@/modules/assessments/types";
import { getCurrentUser } from "@/server/auth/current-user";
import { getAttempt } from "@/server/services/assessment.service";

export const metadata: Metadata = { title: "Assessment result" };

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AttemptPage(props: PageProps<"/assessments/attempts/[attemptId]">) {
  const { attemptId } = await props.params;
  const user = await getCurrentUser();
  const attempt = await getAttempt(user.id, attemptId);
  if (!attempt) notFound();

  const passed = attempt.outcome === "PASSED";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/assessments" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        All assessments
      </Link>

      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border p-6",
          passed ? "border-emerald-500/40 bg-emerald-500/8" : "border-border bg-muted/30",
        )}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className={cn(
              "grid size-24 shrink-0 place-items-center rounded-full border-4 text-2xl font-semibold tabular-nums",
              passed ? "border-emerald-500 text-emerald-600 dark:text-emerald-300" : "border-muted-foreground/30",
            )}
          >
            {attempt.percent}%
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-lg font-semibold">
              {passed ? (
                <BadgeCheckIcon className="size-5 text-emerald-500" aria-hidden />
              ) : (
                <SproutIcon className="size-5 text-muted-foreground" aria-hidden />
              )}
              {passed ? (confirmsAbility(attempt.kind) ? "Demonstrated" : "Understanding confirmed") : "Not yet"}
            </p>
            <h1 className="text-xl font-medium">{attempt.title}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{ASSESSMENT_KIND_LABEL[attempt.kind]}</span>
              <span>
                <span aria-hidden>{attempt.skill.tree.emoji}</span> {attempt.skill.name}
              </span>
              <EvaluatorBadge evaluator={attempt.evaluator} />
              <span>
                Pass mark {attempt.passPercent}% · {dateFormat.format(attempt.createdAt)}
              </span>
              {attempt.xpAwarded > 0 && <span className="font-medium text-xp">+{attempt.xpAwarded} XP</span>}
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-2 text-sm">
          <p>{attempt.feedback.summary}</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Next: </span>
            {attempt.feedback.nextStep}
          </p>
        </div>
      </section>

      {attempt.feedback.criteria && (
        <Card>
          <CardHeader>
            <CardTitle>Rubric</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {attempt.feedback.criteria.map((criterion) => (
                <li key={criterion.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{criterion.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {criterion.score}/{RUBRIC_MAX} · {RUBRIC_SCALE[criterion.score]?.label}
                    </span>
                  </div>
                  <div className="flex gap-1" aria-hidden>
                    {Array.from({ length: RUBRIC_MAX }, (_, index) => (
                      <span
                        key={index}
                        className={cn("h-1.5 flex-1 rounded-full", index < criterion.score ? "bg-primary" : "bg-muted")}
                      />
                    ))}
                  </div>
                  {criterion.note && <p className="text-xs text-muted-foreground">{criterion.note}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {attempt.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your answers</CardTitle>
            {!passed && (
              <p className="text-sm text-muted-foreground">
                Correct answers are shown once you pass — so the next attempt still checks what you know.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {attempt.questions.map((question, index) => (
                <li key={index} className="space-y-1.5">
                  <p className="flex items-start gap-2 text-sm font-medium">
                    {question.correct ? (
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-label="Correct" />
                    ) : (
                      <XIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Not correct" />
                    )}
                    {question.prompt}
                  </p>
                  <p className="pl-6 text-xs text-muted-foreground">
                    Your answer: {question.chosen !== null ? question.options[question.chosen] : "—"}
                    {question.answer !== null && !question.correct && <> · Correct: {question.options[question.answer]}</>}
                  </p>
                  {question.explanation && <p className="pl-6 text-xs text-muted-foreground">{question.explanation}</p>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {(attempt.response || attempt.evidence.length > 0 || attempt.project) && (
        <Card>
          <CardHeader>
            <CardTitle>What you submitted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {attempt.project && (
              <p className="text-sm">
                Project:{" "}
                <Link href={`/projects/${attempt.project.id}`} className="font-medium text-primary hover:underline">
                  {attempt.project.title}
                </Link>
              </p>
            )}
            {attempt.evidence.map((item) =>
              item.url ? (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLinkIcon className="size-3.5" aria-hidden />
                  {item.url}
                </a>
              ) : null,
            )}
            {attempt.response && <blockquote className="border-l-2 pl-3 text-sm whitespace-pre-line text-muted-foreground">{attempt.response}</blockquote>}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/assessments/${attempt.assessmentKey}`} className={buttonVariants({ variant: passed ? "outline" : "default" })}>
          <RotateCcwIcon data-icon="inline-start" />
          {passed ? "Take it again" : "Try again"}
        </Link>
        <Link href="/passport" className={buttonVariants({ variant: "ghost" })}>
          See your passport
        </Link>
      </div>
    </div>
  );
}
