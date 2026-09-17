import { ArrowLeftIcon, ClipboardCheckIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EvidenceList } from "@/components/projects/evidence-list";
import { ProjectStatusChip } from "@/components/projects/project-card";
import { ProjectMilestones } from "@/components/projects/project-milestones";
import { ProjectStatusActions } from "@/components/projects/project-status-actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROJECT_ASSESSMENT_PREFIX } from "@/modules/assessments/catalogue";
import { PROJECT_CATEGORIES } from "@/modules/projects/categories";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProject } from "@/server/services/project.service";

export async function generateMetadata(props: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await props.params;
  const user = await getCurrentUser();
  const project = await getProject(user.id, projectId);
  return { title: project?.title ?? "Project" };
}

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" });

export default async function ProjectPage(props: PageProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;
  const user = await getCurrentUser();
  const project = await getProject(user.id, projectId);
  if (!project) notFound();

  const category = PROJECT_CATEGORIES[project.category];
  const completed = project.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <Link href="/projects" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        All projects
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            <span aria-hidden>{category.emoji}</span> {category.label}
          </span>
          <ProjectStatusChip status={project.status} />
          {completed && project.completedAt && <span>Finished {dateFormat.format(project.completedAt)}</span>}
          {completed && project.xpAwarded > 0 && <span className="text-xp tabular-nums">+{project.xpAwarded} XP</span>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{project.title}</h1>
            {project.description && <p className="max-w-prose text-sm whitespace-pre-line text-muted-foreground">{project.description}</p>}
          </div>
          <Link href={`/projects/${project.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Link>
        </div>
        <ProjectStatusActions
          projectId={project.id}
          status={project.status}
          evidenceCount={project.evidence.length}
          skillCount={project.skills.length}
        />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
          <CardDescription>
            Proof that this exists: live links, code, documents, recordings or a written account. This is what shows on your Skill
            Passport.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvidenceList projectId={project.id} evidence={project.evidence} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>Finished milestones add to the XP this project pays on completion.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectMilestones projectId={project.id} milestones={project.milestones} locked={completed} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills involved</CardTitle>
            <CardDescription>
              {completed
                ? "Completed with evidence, this project demonstrates these skills. A project review can confirm mastery."
                : "When the project is complete, these skills earn XP and the evidence counts as proof of them."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {project.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No skills yet.{" "}
                <Link href={`/projects/${project.id}/edit`} className="text-primary hover:underline">
                  Choose the skills it uses
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y">
                {project.skills.map(({ skill }) => (
                  <li key={skill.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <span aria-hidden>{skill.tree.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/skills/${skill.tree.slug}`} className="text-sm font-medium hover:underline">
                        {skill.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{skill.tree.name}</p>
                    </div>
                    {completed && project.evidence.length > 0 && (
                      <Link
                        href={`/assessments/${PROJECT_ASSESSMENT_PREFIX}${skill.slug}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        <ClipboardCheckIcon data-icon="inline-start" />
                        Get it reviewed
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reflection</CardTitle>
          <CardDescription>What building it taught you.</CardDescription>
        </CardHeader>
        <CardContent>
          {project.reflection ? (
            <blockquote className="border-l-2 border-primary/50 pl-3 text-sm whitespace-pre-line">{project.reflection}</blockquote>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing written yet.{" "}
              <Link href={`/projects/${project.id}/edit`} className="text-primary hover:underline">
                Add a reflection
              </Link>{" "}
              — it appears with the project on your passport.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
