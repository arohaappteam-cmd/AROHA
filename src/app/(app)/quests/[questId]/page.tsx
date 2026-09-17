import { ArrowLeftIcon, BookOpenIcon, CompassIcon, FlagIcon, HeadphonesIcon, ListChecksIcon, SparklesIcon, TargetIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { categoryStyle } from "@/components/quests/category-style";
import { LessonView } from "@/components/quests/lesson-view";
import { QuestActionPanel } from "@/components/quests/quest-action-panel";
import { QuestMeta } from "@/components/quests/quest-meta";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { displayDateOnly } from "@/modules/goals/dates";
import { categoryFor } from "@/modules/quests/categories";
import { getQuestDetail, type QuestDetail } from "@/server/services/quest-view.service";

export async function generateMetadata(props: PageProps<"/quests/[questId]">): Promise<Metadata> {
  const { questId } = await props.params;
  const quest = await getQuestDetail(questId);
  return { title: quest?.title ?? "Quest" };
}

function reflectionPromptFor(quest: QuestDetail): string {
  if (quest.lesson) return quest.lesson.reflectionPrompt;
  if (quest.payload?.kind === "prompts") return quest.payload.prompts[0];
  switch (quest.lifeArea) {
    case "PHYSICAL":
      return "How did your body feel afterwards?";
    case "MENTAL":
      return "What did you notice in your mind?";
    case "LEARNING":
      return "What's one idea you want to remember?";
    case "SOCIAL":
      return "Who did you connect with, and how did it feel?";
    case "PERSONAL_GOAL":
      return "What moved forward, and where will you pick up next time?";
    default:
      return "What did today's quest give you?";
  }
}

function PayloadCard({ quest }: { quest: QuestDetail }) {
  const payload = quest.payload;
  if (!payload || payload.kind === "lesson" || payload.kind === "prompts") return null;

  if (payload.kind === "goal") {
    return (
      <Link href={payload.href} className="group flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-primary/50">
        <span className="grid size-10 place-items-center rounded-lg bg-violet-500/12 text-violet-500">
          <TargetIcon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">{quest.goal ? "Part of your goal" : "Goals"}</span>
          <span className="block truncate font-medium">{quest.goal?.title ?? "Create your first goal"}</span>
          {quest.mission && (
            <span className="block truncate text-sm text-muted-foreground">
              Mission: {quest.mission.title}
              {quest.mission.status === "COMPLETED" && " ✓"}
            </span>
          )}
        </span>
        <FlagIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    );
  }

  if (payload.kind === "experiment") {
    return (
      <Link
        href={`/discover/${payload.experimentId}`}
        className="group flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-primary/50"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-500/12 text-xl" aria-hidden>
          🧪
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">Part of your experiment</span>
          <span className="block font-medium">Practice day {payload.dayNumber}</span>
          <span className="block text-sm text-muted-foreground">Completing it counts as a practice day.</span>
        </span>
      </Link>
    );
  }

  const content =
    payload.kind === "reading"
      ? { icon: BookOpenIcon, title: `${payload.pages} pages`, body: "Any book you're reading. Don't have one? Swap this quest for a micro-lesson." }
      : payload.kind === "practice"
        ? { icon: CompassIcon, title: `Practice: ${payload.topic}`, body: "Pick one small thing you can't quite do yet, and focus only on that." }
        : {
            icon: HeadphonesIcon,
            title: payload.format === "AUDIO" ? "Listen & learn" : payload.format === "VIDEO" ? "Watch & learn" : "Course lesson",
            body: payload.topic ? `Suggested topic: ${payload.topic}` : "Choose something you're genuinely curious about.",
          };
  const Icon = content.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-500/12 text-amber-500">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-medium">{content.title}</p>
        <p className="text-sm text-muted-foreground">{content.body}</p>
      </div>
    </div>
  );
}

export default async function QuestPage(props: PageProps<"/quests/[questId]">) {
  const { questId } = await props.params;
  const quest = await getQuestDetail(questId);
  if (!quest) notFound();

  const category = categoryFor(quest.lifeArea);
  const style = categoryStyle(quest.lifeArea);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        {quest.isToday ? "Today's journey" : "Home"}
      </Link>

      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div aria-hidden className={cn("pointer-events-none absolute inset-0", style.glow)} />
        <div className="relative space-y-4 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className={cn("grid size-14 place-items-center rounded-2xl border-2 text-3xl", style.border, style.soft)} aria-hidden>
              {category.emoji}
            </span>
            <div>
              <p className={cn("text-xs font-semibold tracking-[0.2em] uppercase", style.text)}>
                {category.verb} · {category.label}
                {!quest.isCore && " · Side quest"}
              </p>
              <p className="text-xs text-muted-foreground">{quest.isToday ? "Today" : displayDateOnly(quest.date)}</p>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{quest.title}</h1>
          {quest.description && <p className="text-pretty text-muted-foreground">{quest.description}</p>}
          <QuestMeta difficulty={quest.difficulty} minutes={quest.estimatedMinutes} xp={quest.xpReward} xpAwarded={quest.xpAwarded} className="text-sm" />
          {quest.rationale && (
            <p className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {quest.rationale}
            </p>
          )}
        </div>
      </section>

      <PayloadCard quest={quest} />

      {quest.lesson && (
        <Card>
          <CardContent className="py-2">
            <LessonView lesson={quest.lesson} />
          </CardContent>
        </Card>
      )}

      {quest.steps.length > 0 && (
        <Card size="sm">
          <CardContent className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ListChecksIcon className="size-4 text-muted-foreground" aria-hidden />
              How to do it
            </p>
            <ol className="space-y-2">
              {quest.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium", style.soft, style.text)}>{index + 1}</span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <QuestActionPanel quest={quest} reflectionPrompt={reflectionPromptFor(quest)} />
        </CardContent>
      </Card>

      {!quest.xpAwarded && (
        <p className="text-center text-xs text-muted-foreground">
          +{quest.xpReward} XP is recorded with your completion and added to your character when progression launches.
        </p>
      )}
    </div>
  );
}
