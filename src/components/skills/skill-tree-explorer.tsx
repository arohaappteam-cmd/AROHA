"use client";

import { ChevronDownIcon, CircleCheckIcon, CircleDotIcon, CircleIcon, ClipboardCheckIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SKILL_STATUS_META } from "@/components/skills/skill-status";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PROJECT_ASSESSMENT_PREFIX } from "@/modules/assessments/catalogue";
import { skillLevelLabel } from "@/modules/skills/levels";
import { flattenTree, type SkillNode, type SkillStatus } from "@/modules/skills/state";

/**
 * The visual skill tree (spec §15): every skill as a node on its branch,
 * coloured by state, expandable in place for progress and unlock details.
 */

const numberFormat = new Intl.NumberFormat("en");

const STATUS_ICON: Record<SkillStatus, typeof CircleIcon> = {
  MASTERED: CircleCheckIcon,
  IN_PROGRESS: CircleDotIcon,
  AVAILABLE: CircleIcon,
  LOCKED: LockIcon,
};

function LevelPips({ node }: { node: SkillNode }) {
  const meta = SKILL_STATUS_META[node.status];
  return (
    <span className="flex items-center gap-0.5" title={`Level ${node.progress.level} of ${node.maxLevel}`}>
      {Array.from({ length: node.maxLevel }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn("size-1.5 rounded-full", index < node.progress.level ? meta.dot : "bg-border")}
        />
      ))}
      <span className="sr-only">
        Level {node.progress.level} of {node.maxLevel}
      </span>
    </span>
  );
}

function NodeDetail({ node, unlocks }: { node: SkillNode; unlocks: SkillNode[] }) {
  const meta = SKILL_STATUS_META[node.status];
  const { progress } = node;

  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-3 text-sm">
      {node.description && <p className="text-muted-foreground">{node.description}</p>}

      {node.status === "LOCKED" && node.requirement ? (
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <LockIcon className="size-3.5 shrink-0" aria-hidden />
          Unlocks when <span className="font-medium text-foreground">{node.requirement.name}</span> reaches level {node.requirement.level}.
        </p>
      ) : node.status === "MASTERED" ? (
        <p className={cn("font-medium", meta.text)}>Mastered — top level reached and ability demonstrated.</p>
      ) : node.awaitingProof ? (
        <div className="space-y-2">
          <p className="font-medium">Top level reached through practice.</p>
          <p className="text-muted-foreground">
            Practice alone isn&apos;t mastery. Pass a practical task or have a finished project reviewed to confirm it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/assessments" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <ClipboardCheckIcon className="size-3.5" aria-hidden />
              Find an assessment
            </Link>
            <Link
              href={`/assessments/${PROJECT_ASSESSMENT_PREFIX}${node.slug}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Review a project for {node.name}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">
              {skillLevelLabel(progress.level, node.maxLevel)} · Level {progress.level}/{node.maxLevel}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {numberFormat.format(progress.xpIntoLevel)} / {numberFormat.format(progress.xpForNextLevel)} XP to level {progress.level + 1}
            </span>
          </div>
          <Progress value={progress.percent} aria-label={`${node.name} progress`} className="gap-0">
            <ProgressTrack className="h-1.5">
              <ProgressIndicator className={meta.dot} />
            </ProgressTrack>
          </Progress>
          {node.status === "AVAILABLE" && (
            <p className="text-xs text-muted-foreground">Ready to start — real action that trains this will open it up.</p>
          )}
        </div>
      )}

      {unlocks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Levelling this unlocks:{" "}
          {unlocks.map((skill, index) => (
            <span key={skill.id}>
              {index > 0 && ", "}
              <span className="font-medium text-foreground">{skill.name}</span> (at Lv {skill.unlockLevel})
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function TreeBranch({
  nodes,
  depth,
  expanded,
  onToggle,
  unlocksOf,
}: {
  nodes: SkillNode[];
  depth: number;
  expanded: string | null;
  onToggle: (id: string) => void;
  unlocksOf: (id: string) => SkillNode[];
}) {
  return (
    <ul className={cn(depth > 0 && "ml-2.5 border-l pl-4 sm:ml-3.5 sm:pl-5")}>
      {nodes.map((node) => {
        const meta = SKILL_STATUS_META[node.status];
        const Icon = STATUS_ICON[node.status];
        const isOpen = expanded === node.id;
        const locked = node.status === "LOCKED";

        return (
          <li key={node.id} className="py-1">
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-expanded={isOpen}
              className={cn(
                "flex w-full flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/50",
                isOpen && "border-primary/50 bg-muted/30",
                locked && "border-dashed",
              )}
            >
              <Icon className={cn("size-4 shrink-0", meta.text)} aria-hidden />
              <span className={cn("text-sm font-medium", locked && "text-muted-foreground")}>{node.name}</span>
              <span className={cn("rounded-full px-1.5 py-px text-[10px] font-medium tracking-wide uppercase", meta.badge)}>
                {node.awaitingProof
                  ? "Ready to prove"
                  : node.status === "IN_PROGRESS"
                    ? skillLevelLabel(node.progress.level, node.maxLevel)
                    : meta.label}
              </span>
              <span className="ml-auto flex items-center gap-2">
                {node.progress.xp > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{numberFormat.format(node.progress.xp)} XP</span>
                )}
                <LevelPips node={node} />
                <ChevronDownIcon
                  className={cn("size-3.5 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                  aria-hidden
                />
              </span>
            </button>
            {isOpen && (
              <div className="mt-1.5 mb-1">
                <NodeDetail node={node} unlocks={unlocksOf(node.id)} />
              </div>
            )}
            {node.children.length > 0 && (
              <TreeBranch nodes={node.children} depth={depth + 1} expanded={expanded} onToggle={onToggle} unlocksOf={unlocksOf} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SkillTreeExplorer({ nodes }: { nodes: SkillNode[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const flat = useMemo(() => flattenTree(nodes), [nodes]);
  const unlocksOf = (id: string) => flat.filter((node) => node.requiresId === id);

  return (
    <div className="space-y-3">
      <TreeBranch
        nodes={nodes}
        depth={0}
        expanded={expanded}
        onToggle={(id) => setExpanded((current) => (current === id ? null : id))}
        unlocksOf={unlocksOf}
      />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(Object.keys(SKILL_STATUS_META) as SkillStatus[]).map((status) => {
          const meta = SKILL_STATUS_META[status];
          return (
            <span key={status} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden />
              {meta.label} — {meta.hint.toLowerCase()}
            </span>
          );
        })}
      </p>
    </div>
  );
}
