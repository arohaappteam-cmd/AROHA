import { SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";

import {
  AnalysisCard,
  GoalGuidanceCard,
  RecommendationsCard,
  SkillGapCard,
} from "@/components/mentor/insight-cards";
import { PageHeader } from "@/components/common/page-header";
import { LessonView } from "@/components/quests/lesson-view";
import { Card, CardContent } from "@/components/ui/card";
import { getMentorPanel } from "@/server/services/mentor.service";

export const metadata: Metadata = { title: "Mentor" };

export default async function MentorPage() {
  await connection();
  const panel = await getMentorPanel();
  const { insights } = panel;
  const usingFallback = panel.source.insights === "fallback";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Mentor"
        title={insights.headline}
        description={
          panel.aiConfigured
            ? "Your mentor reads your goals, quests and reflections to guide what's next."
            : "Built-in guidance for now. Connect an AI model to make the mentor personal to you."
        }
      />

      {!panel.aiConfigured && usingFallback && (
        <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <SparklesIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            The AI Mentor runs on Claude. Set <code className="rounded bg-background px-1">AI_PROVIDER=anthropic</code> and{" "}
            <code className="rounded bg-background px-1">ANTHROPIC_API_KEY</code> to turn it on. Everything below is AROHA&apos;s
            deterministic guidance in the meantime.
          </span>
        </p>
      )}

      <AnalysisCard analysis={insights.analysis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecommendationsCard recommendations={insights.recommendations} />
        <SkillGapCard skillGaps={insights.skillGaps} />
      </div>

      {insights.goalGuidance && <GoalGuidanceCard guidance={insights.goalGuidance} />}

      <section aria-labelledby="discovery-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="discovery-title" className="text-lg font-semibold">
            Today&apos;s discovery
          </h2>
          <span className="text-xs text-muted-foreground">
            {panel.source.discovery === "ai" ? "Written for you" : "From the lesson library"}
          </span>
        </div>
        <Card>
          <CardContent className="py-2">
            <LessonView lesson={panel.discovery} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
