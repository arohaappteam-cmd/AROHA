import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "@/server/actions/project.actions";
import { listSkillOptions } from "@/server/services/project.service";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  await connection();
  const skillTrees = await listSkillOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="New project"
        title="Start something real"
        description="Pick something you could show another person when it's finished."
      />
      <ProjectForm
        mode="create"
        initial={{ title: "", description: "", category: "", skillIds: [], reflection: "", milestones: "" }}
        skillTrees={skillTrees}
        submit={createProjectAction}
        cancelHref="/projects"
      />
    </div>
  );
}
