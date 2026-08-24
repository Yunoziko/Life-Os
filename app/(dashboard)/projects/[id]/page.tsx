import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getProjectWorkspace } from "@/lib/db/projects";
import { getAssignableOptions } from "@/lib/db/tasks";
import { serializeTasks } from "@/lib/tasks/serialize";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { getGitHubRepoSnapshot } from "@/lib/integrations/github/client";

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
  const github = project.githubRepo
    ? await getGitHubRepoSnapshot(user.id, project.githubRepo).catch(() => null)
    : null;

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
        githubRepo: project.githubRepo,
      }}
      tasks={serializeTasks(project.tasks)}
      notes={project.notes.map((note) => ({
        ...note,
        updatedAt: note.updatedAt.toISOString(),
      }))}
      learningItems={project.learningItems.map((item) => ({
        id: item.id,
        title: item.title,
        progress: item.progress,
        status: item.status,
      }))}
      github={
        github
          ? {
              repo: github.fullName,
              latestCommit: github.latestCommit,
              openIssues: github.openIssues,
              openPulls: github.openPulls,
            }
          : null
      }
      projects={projects}
      goals={goals}
      timezone={timezone}
    />
  );
}
