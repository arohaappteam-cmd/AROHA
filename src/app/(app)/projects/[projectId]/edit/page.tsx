import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { updateProjectAction } from "@/server/actions/project.actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProject, listSkillOptions } from "@/server/services/project.service";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage(props: PageProps<"/projects/[projectId]/edit">) {
  const { projectId } = await props.params;
  const user = await getCurrentUser();
  const [project, skillTrees] = await Promise.all([getProject(user.id, projectId), listSkillOptions()]);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Edit project" title={project.title} />
      <ProjectForm
        mode="edit"
        initial={{
          title: project.title,
          description: project.description ?? "",
          category: project.category,
          skillIds: project.skills.map(({ skill }) => skill.id),
          reflection: project.reflection ?? "",
          milestones: "",
        }}
        skillTrees={skillTrees}
        submit={updateProjectAction.bind(null, project.id)}
        cancelHref={`/projects/${project.id}`}
      />
    </div>
  );
}
