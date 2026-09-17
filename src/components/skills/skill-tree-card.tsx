import { LockIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

import { categoryStyle } from "@/components/quests/category-style";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SkillTreeCard as SkillTreeCardData } from "@/server/services/skill.service";

/** One tree on the skills overview: where you are, and what opens next. */
export function SkillTreeCard({ tree }: { tree: SkillTreeCardData }) {
  const style = categoryStyle(tree.lifeArea);
  const { summary, frontier, nextUnlock } = tree;
  const touched = summary.mastered + summary.learning;

  return (
    <Link href={`/skills/${tree.slug}`} className="group block h-full">
      <Card className="relative h-full overflow-hidden transition-colors group-hover:border-primary/50">
        <div className={cn("pointer-events-none absolute inset-0 opacity-70", style.glow)} aria-hidden />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              {tree.emoji}
            </span>
            {tree.name}
            <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
              {summary.mastered}/{summary.total} mastered
            </span>
          </CardTitle>
          <CardDescription>{tree.description}</CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-3">
          {frontier ? (
            <div className="space-y-1.5">
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {frontier.started ? "Learning" : "Next up"}: {frontier.name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {frontier.levelLabel} · Lv {frontier.level}/{frontier.maxLevel}
                </span>
              </p>
              <Progress value={frontier.percent} aria-label={`${frontier.name} progress`} className="gap-0">
                <ProgressTrack>
                  <ProgressIndicator className={style.solid} />
                </ProgressTrack>
              </Progress>
            </div>
          ) : tree.awaitingProof.length > 0 ? (
            <p className="text-sm">
              <span className="font-medium">Ready to prove:</span>{" "}
              <span className="text-muted-foreground">{tree.awaitingProof.map((skill) => skill.name).join(", ")}</span>
            </p>
          ) : (
            <p className={cn("flex items-center gap-1.5 text-sm font-medium", style.text)}>
              <SparklesIcon className="size-4" aria-hidden />
              Fully mastered
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {touched > 0 && <span>{summary.learning > 0 ? `${summary.learning} in progress` : "nothing in progress"}</span>}
            <span>{summary.available} ready to start</span>
            {nextUnlock && (
              <span className="flex items-center gap-1">
                <LockIcon className="size-3" aria-hidden />
                {nextUnlock.name} opens at {nextUnlock.requirement.name} Lv {nextUnlock.requirement.level}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
