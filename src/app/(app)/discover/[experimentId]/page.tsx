import { ArrowLeftIcon, GitBranchIcon, MapIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ExperimentControls } from "@/components/experiments/experiment-controls";
import { PracticeDots } from "@/components/experiments/experiment-card";
import { ExperimentReviewForm } from "@/components/experiments/experiment-review-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DECISION_META, experimentXpReward, IMPROVEMENT_LABEL, SCALE_LABELS } from "@/modules/experiments/logic";
import { displayDateOnly } from "@/modules/goals/dates";
import { findTreeSpec } from "@/modules/skills/catalogue";
import { getCurrentUser } from "@/server/auth/current-user";
import { getExperiment } from "@/server/services/experiment.service";
import { Glyph } from "@/components/common/glyph";

export const metadata: Metadata = { title: "Experiment" };

export default async function ExperimentPage(props: PageProps<"/discover/[experimentId]">) {
  await connection();
  const { experimentId } = await props.params;
  const user = await getCurrentUser();
  const experiment = await getExperiment(user, experimentId);
  if (!experiment) notFound();

  const { progress, status, review } = experiment;
  const tree = experiment.skillTree ? findTreeSpec(experiment.skillTree) : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/discover" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        Discover
      </Link>

      <header className="space-y-3">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Experiment</p>
        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight md:text-3xl">
          <span aria-hidden><Glyph emoji={experiment.emoji} /></span>
          {experiment.title}
        </h1>
        {experiment.description && <p className="text-sm text-muted-foreground">{experiment.description}</p>}
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {displayDateOnly(experiment.startDate)} – {displayDateOnly(progress.endDate)}
          </span>
          <span>{experiment.dailyMinutes} minutes a day</span>
          {tree && (
            <Link href={`/skills/${tree.slug}`} className="flex items-center gap-1 hover:underline">
              <GitBranchIcon className="size-3" aria-hidden />
              Practice trains {tree.name}
            </Link>
          )}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {progress.daysPracticed} of {experiment.durationDays} days practised
          </CardTitle>
          <CardDescription>
            {status === "ACTIVE" &&
              (experiment.practicedToday
                ? "Today's practice is done. See you tomorrow."
                : `Day ${progress.dayNumber}: today's practice quest is on your path.`)}
            {status === "REVIEW_DUE" && "The experiment is over. Every day you tried counts — now, how did it go?"}
            {status === "REVIEWED" && "Reviewed. This experiment is part of your story now."}
            {status === "ABANDONED" && "Set down early. The days you tried still happened."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PracticeDots experiment={experiment} />
          {status === "ACTIVE" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!experiment.practicedToday ? (
                <Link href="/" className={buttonVariants({ size: "sm" })}>
                  Go to today&apos;s practice
                </Link>
              ) : (
                <span />
              )}
              <ExperimentControls experimentId={experiment.id} running />
            </div>
          )}
        </CardContent>
      </Card>

      {status === "REVIEW_DUE" && (
        <Card>
          <CardHeader>
            <CardTitle>Your review</CardTitle>
            <CardDescription>
              Honest answers help AROHA recommend what to try next.
              {experimentXpReward(progress.daysPracticed) > 0 && ` Finishing the review earns +${experimentXpReward(progress.daysPracticed)} XP for the days you tried.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ExperimentReviewForm experimentId={experiment.id} topic={experiment.topic} />
            <div className="border-t pt-4">
              <ExperimentControls experimentId={experiment.id} running={false} />
            </div>
          </CardContent>
        </Card>
      )}

      {status === "REVIEWED" && (
        <Card>
          <CardHeader>
            <CardTitle>What you found</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Enjoyed it</dt>
                <dd className="font-medium">
                  {review.enjoyment}/5 · {review.enjoyment ? SCALE_LABELS.enjoyment[review.enjoyment - 1] : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Interest</dt>
                <dd className="font-medium">
                  {review.interest}/5 · {review.interest ? SCALE_LABELS.interest[review.interest - 1] : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Improved</dt>
                <dd className="font-medium">{review.improvement ? IMPROVEMENT_LABEL[review.improvement] : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Decision</dt>
                <dd className="font-medium">{review.decision ? DECISION_META[review.decision].label : "—"}</dd>
              </div>
              {review.learned && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">What you learned</dt>
                  <dd className="text-sm whitespace-pre-line">{review.learned}</dd>
                </div>
              )}
            </dl>
            {experiment.goal && (
              <Link href={`/goals/${experiment.goal.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
                <MapIcon data-icon="inline-start" />
                Goal: {experiment.goal.title}
              </Link>
            )}
            {review.xpAwarded > 0 && <p className="mt-3 text-xs text-muted-foreground">+{review.xpAwarded} XP for the days you tried.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
