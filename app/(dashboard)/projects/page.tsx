import { FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getProjectsOverview } from "@/lib/db/projects";
import { ModulePage } from "@/components/shared/module-page";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { ProjectCard } from "@/components/projects/project-card";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const projects = await getProjectsOverview(user.id);

  return (
    <ModulePage
      title="Projects"
      description="Larger areas of work, moving in one place."
      icon={FolderKanban}
      emptyTitle="Nothing in motion yet."
      emptyDescription="Create a project and start moving forward."
      action={<CreateTrigger type="project">Create project</CreateTrigger>}
      isEmpty={projects.length === 0}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} timezone={timezone} />
        ))}
      </div>
    </ModulePage>
  );
}
