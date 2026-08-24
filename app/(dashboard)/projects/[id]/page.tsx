import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getProjectWorkspace } from "@/lib/db/projects";
import { getAssignableOptions } from "@/lib/db/tasks";
import { serializeTasks } from "@/lib/tasks/serialize";
import { ProjectWorkspace } from "@/components/projects/project-workspace";

export const metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [project, [projects, goals]] = await Promise.all([
    getProjectWorkspace(user.id, id),
    getAssignableOptions(user.id),
  ]);

  if (!project) {
    notFound();
  }

  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <ProjectWorkspace
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        color: project.color,
        icon: project.icon,
        startDate: project.startDate?.toISOString() ?? null,
        dueDate: project.dueDate?.toISOString() ?? null,
        completed: project.completed,
        total: project.total,
        percent: project.percent,
        goal: project.goal,
      }}
      tasks={serializeTasks(project.tasks)}
      notes={project.notes.map((note) => ({
        ...note,
        updatedAt: note.updatedAt.toISOString(),
      }))}
      projects={projects}
      goals={goals}
      timezone={timezone}
    />
  );
}
