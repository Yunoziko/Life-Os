import { FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getProjects } from "@/lib/db/workspace";
import { ModulePage } from "@/components/shared/module-page";
import { CreateTrigger } from "@/components/dashboard/create-trigger";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await getProjects(user.id);

  return (
    <ModulePage
      title="Projects"
      description="Bodies of work that last longer than a single task."
      icon={FolderKanban}
      emptyTitle="No projects yet"
      emptyDescription="Create a project when a set of tasks deserves its own home."
      action={<CreateTrigger type="project">New project</CreateTrigger>}
      isEmpty={projects.length === 0}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <article
            key={project.id}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">{project.name}</h2>
              <span className="text-xs text-muted-foreground">{project.status.toLowerCase()}</span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {project.description || "No description yet."}
            </p>
          </article>
        ))}
      </div>
    </ModulePage>
  );
}
