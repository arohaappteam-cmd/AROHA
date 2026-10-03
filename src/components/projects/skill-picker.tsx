"use client";

import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { MAX_PROJECT_SKILLS } from "@/modules/projects/status";
import type { SkillOptionTree } from "@/server/services/project.service";
import { Glyph } from "@/components/common/glyph";

/**
 * Pick the skills a project really uses. Trees suggested by the category open
 * first; everything else is one click away.
 */
export function SkillPicker({
  trees,
  selected,
  onChange,
  suggestedTrees,
}: {
  trees: SkillOptionTree[];
  selected: string[];
  onChange: (next: string[]) => void;
  suggestedTrees: readonly string[];
}) {
  const nameById = new Map(trees.flatMap((tree) => tree.skills.map((skill) => [skill.id, skill.name] as const)));
  const full = selected.length >= MAX_PROJECT_SKILLS;
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : full ? selected : [...selected, id]);

  const ordered = [...trees.filter((t) => suggestedTrees.includes(t.slug)), ...trees.filter((t) => !suggestedTrees.includes(t.slug))];

  return (
    <div className="space-y-3">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 p-2">
        {selected.length === 0 ? (
          <span className="px-1 text-sm text-muted-foreground">No skills chosen yet</span>
        ) : (
          selected.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
            >
              {nameById.get(id) ?? "Skill"}
              <XIcon className="size-3" aria-label="Remove" />
            </button>
          ))
        )}
        <span className="ml-auto px-1 text-xs text-muted-foreground tabular-nums">
          {selected.length}/{MAX_PROJECT_SKILLS}
        </span>
      </div>

      <div className="space-y-1.5">
        {ordered.map((tree) => {
          const count = tree.skills.filter((skill) => selected.includes(skill.id)).length;
          return (
            <details key={tree.slug} open={suggestedTrees.includes(tree.slug)} className="group rounded-lg border">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium select-none">
                <span aria-hidden><Glyph emoji={tree.emoji} /></span>
                {tree.name}
                {count > 0 && <span className="rounded-full bg-primary/15 px-1.5 text-xs text-primary tabular-nums">{count}</span>}
                {suggestedTrees.includes(tree.slug) && (
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Suggested</span>
                )}
              </summary>
              <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                {tree.skills.map((skill) => {
                  const active = selected.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      aria-pressed={active}
                      disabled={!active && full}
                      onClick={() => toggle(skill.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40",
                        active ? "border-primary bg-primary/15 font-medium text-primary" : "hover:border-primary/50",
                        skill.nested && "border-dashed",
                      )}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
