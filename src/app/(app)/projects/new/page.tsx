import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "@/server/actions/project.actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { listSkillOptions, projectLimitMessage } from "@/server/services/project.service";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  await connection();
  const user = await getCurrentUser();
  const [skillTrees, limit] = await Promise.all([listSkillOptions(), projectLimitMessage(user.id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="New project"
        title="Start something real"
        description="Pick something you could show another person when it's finished."
      />
      {limit && <UpgradeNotice message={limit} />}
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
