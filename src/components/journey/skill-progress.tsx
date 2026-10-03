import { CheckIcon, GitBranchIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SkillPathState } from "@/modules/skills/state";
import type { SkillJourney } from "@/server/services/journey.service";

import { HudLabel, Meter } from "./hud";
import { Glyph } from "@/components/common/glyph";

const STAGES = ["Beginner", "Intermediate", "Advanced"] as const;

/** Where a level sits on a skill's own scale — AROHA's progression, not a measurement of ability. */
function stageOf(level: number, maxLevel: number): number {
  const fraction = level / maxLevel;
  return fraction <= 1 / 3 ? 0 : fraction <= 2 / 3 ? 1 : 2;
}

const NODE_TEXT: Record<SkillPathState, string> = {
  mastered: "mastered",
  complete: "top level, proof pending",
  current: "learning now",
  started: "started",
  next: "ready to start",
  locked: "locked",
};

function PathNode({ state }: { state: SkillPathState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full",
        (state === "mastered" || state === "complete") && "glow-success bg-success text-success-foreground",
        state === "current" && "border-2 border-success bg-card",
        state === "started" && "border border-success/60 bg-success/15",
        state === "next" && "border border-border bg-card",
        state === "locked" && "border border-border bg-muted text-muted-foreground",
      )}
    >
      {(state === "mastered" || state === "complete") && <CheckIcon className="size-3" strokeWidth={3} />}
      {state === "current" && <span className="size-1.5 rounded-full bg-success" />}
      {state === "locked" && <LockIcon className="size-2.5" />}
    </span>
  );
}

function SkillCard({ skill }: { skill: SkillJourney }) {
  const frontier = skill.frontier;
  const stage = frontier ? stageOf(frontier.level, frontier.maxLevel) : 2;
  const marker = frontier ? (frontier.level / frontier.maxLevel) * 100 : 100;

  return (
    <li className="space-y-4 rounded-xl border bg-background/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/skills/${skill.slug}`} className="font-medium underline-offset-4 hover:underline">
            <span aria-hidden><Glyph emoji={skill.emoji} /></span> {skill.name}
          </Link>
          <p className="text-xs text-muted-foreground">{frontier ? `Now: ${frontier.name}` : "Everything here is complete"}</p>
        </div>
        {frontier && (
          <p className="shrink-0 text-right">
            <span className="text-lg font-semibold tabular-nums">Lv {frontier.level}</span>
            <span className="font-mono text-xs text-muted-foreground">/{frontier.maxLevel}</span>
          </p>
        )}
      </div>

      {frontier && <Meter percent={frontier.percent} label={`${frontier.name}: progress to the next level`} size="sm" />}

      <div>
        <div className="relative h-px bg-border">
          <span
            aria-hidden
            className="glow-success absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success ring-2 ring-card"
            style={{ left: `${Math.max(2, Math.min(98, marker))}%` }}
          />
        </div>
        <ol className="mt-2 grid grid-cols-3 font-mono text-[10px] tracking-[0.14em] uppercase">
          {STAGES.map((name, index) => (
            <li key={name} className={cn(index === 1 && "text-center", index === 2 && "text-right", index === stage ? "text-success" : "text-muted-foreground")}>
              {name}
              {index === stage && <span className="sr-only"> (you are here)</span>}
            </li>
          ))}
        </ol>
      </div>

      {skill.path.length > 0 && (
        <div className="space-y-2">
          <HudLabel>Skill path</HudLabel>
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs">
            {skill.path.map((step, index) => (
              <Fragment key={step.slug}>
                {index > 0 && (
                  <li aria-hidden className={cn("h-px w-3", step.state === "locked" || step.state === "next" ? "bg-border" : "bg-success/60")} />
                )}
                <li className="flex items-center gap-1.5">
                  <PathNode state={step.state} />
                  <span className={cn(step.state === "locked" || step.state === "next" ? "text-muted-foreground" : "text-foreground")}>{step.name}</span>
                  <span className="sr-only">({NODE_TEXT[step.state]})</span>
                </li>
              </Fragment>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

/** The skill trees the user has worked in, strongest first. */
export function SkillProgress({ skills }: { skills: SkillJourney[] }) {
  if (skills.length === 0) {
    return (
      <EmptyState
        icon={GitBranchIcon}
        title="No skills trained yet"
        description="Quests, lessons and projects train skills. The first one you level will appear here with its path."
        action={
          <Link href="/skills" className={buttonVariants({ variant: "outline", size: "sm" })}>
            See the skill trees
          </Link>
        }
      />
    );
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {skills.map((skill) => (
        <SkillCard key={skill.slug} skill={skill} />
      ))}
    </ul>
  );
}
