import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";
import { listProjects } from "@/server/services/project.service";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await connection();
  const user = await getCurrentUser();
  const projects = await listProjects(user.id);

  const active = projects.filter((project) => project.status !== "COMPLETED");
  const completed = projects.filter((project) => project.status === "COMPLETED");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Projects"
        title="Things you're making"
        description="Real work with real evidence. A project completes only when there's something to show — and that's what turns practice into proof."
        actions={
          <Link href="/projects/new" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" />
            New project
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="No projects yet"
          description="An app, an article, a portfolio, a recording, a meal for ten. Start something you could show someone when it's done."
          action={
            <Link href="/projects/new" className={buttonVariants()}>
              <PlusIcon data-icon="inline-start" />
              Start your first project
            </Link>
          }
        />
      ) : (
        <>
          <section aria-labelledby="active-title" className="space-y-3">
            <h2 id="active-title" className="text-lg font-semibold">
              In the making <span className="text-sm font-normal text-muted-foreground tabular-nums">({active.length})</span>
            </h2>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in progress — everything here is finished.</p>
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                {active.map((project) => (
                  <li key={project.id}>
                    <ProjectCard project={project} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {completed.length > 0 && (
            <section aria-labelledby="completed-title" className="space-y-3">
              <h2 id="completed-title" className="text-lg font-semibold">
                Finished <span className="text-sm font-normal text-muted-foreground tabular-nums">({completed.length})</span>
              </h2>
              <ul className="grid gap-4 lg:grid-cols-2">
                {completed.map((project) => (
                  <li key={project.id}>
                    <ProjectCard project={project} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
