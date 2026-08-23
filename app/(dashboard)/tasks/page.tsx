import { requireUser } from "@/lib/auth/session";
import { getAssignableOptions, getWorkspaceTasks } from "@/lib/db/tasks";
import { serializeTasks } from "@/lib/tasks/serialize";
import { PageHeader } from "@/components/layout/page-header";
import { TaskWorkspace } from "@/components/tasks/task-workspace";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const [tasks, [projects, goals]] = await Promise.all([
    getWorkspaceTasks(user.id),
    getAssignableOptions(user.id),
  ]);

  return (
    <div>
      <PageHeader title="Tasks" description="Everything you need to get done." />
      <TaskWorkspace
        tasks={serializeTasks(tasks)}
        projects={projects}
        goals={goals}
        timezone={timezone}
      />
    </div>
  );
}
