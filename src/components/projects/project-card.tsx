import { BadgeCheckIcon, ListChecksIcon, PaperclipIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PROJECT_CATEGORIES } from "@/modules/projects/categories";
import { PROJECT_STATUS_LABEL } from "@/modules/projects/status";
import type { ProjectWithRelations } from "@/server/repositories/project.repository";

const STATUS_STYLE = {
  PLANNING: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  PAUSED: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
  COMPLETED: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
} as const;

export function ProjectStatusChip({ status }: { status: ProjectWithRelations["status"] }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>
      {status === "COMPLETED" && <BadgeCheckIcon className="size-3" aria-hidden />}
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

export function ProjectCard({ project }: { project: ProjectWithRelations }) {
  const category = PROJECT_CATEGORIES[project.category];
  const done = project.milestones.filter((m) => m.completedAt).length;

  return (
    <Link href={`/projects/${project.id}`} className="group block h-full">
      <Card className="h-full transition-colors group-hover:ring-primary/40">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              <span aria-hidden>{category.emoji}</span> {category.label}
            </span>
            <ProjectStatusChip status={project.status} />
          </div>
          <CardTitle className="text-lg">{project.title}</CardTitle>
          {project.description && <CardDescription className="line-clamp-2">{project.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-3">
          {project.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.skills.map(({ skill }) => (
                <span key={skill.id} className="rounded-full border px-2 py-0.5 text-xs">
                  <span aria-hidden>{skill.tree.emoji}</span> {skill.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
            <span className="flex items-center gap-1">
              <ListChecksIcon className="size-3.5" aria-hidden />
              {project.milestones.length > 0 ? `${done}/${project.milestones.length} milestones` : "No milestones"}
            </span>
            <span className={cn("flex items-center gap-1", project.evidence.length > 0 && "text-emerald-600 dark:text-emerald-300")}>
              <PaperclipIcon className="size-3.5" aria-hidden />
              {project.evidence.length} evidence
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
