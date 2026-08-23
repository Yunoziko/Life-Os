import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getGoalWorkspace } from "@/lib/db/goals";
import { getAssignableOptions } from "@/lib/db/tasks";
import { GoalWorkspace } from "@/components/goals/goal-workspace";

export const metadata = { title: "Goal" };

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [goal, [projects]] = await Promise.all([
    getGoalWorkspace(user.id, id),
    getAssignableOptions(user.id),
  ]);

  if (!goal) {
    notFound();
  }

  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <GoalWorkspace
      goal={{
        id: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        status: goal.status,
        priority: goal.priority,
        targetDate: goal.targetDate?.toISOString() ?? null,
        progress: goal.progress,
        source: goal.source,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
        milestones: goal.milestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          completed: milestone.completed,
          dueDate: milestone.dueDate?.toISOString() ?? null,
        })),
        tasks: goal.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueAt: task.dueAt?.toISOString() ?? null,
        })),
        projects: goal.projects.map((project) => ({
          id: project.id,
          name: project.name,
          status: project.status,
        })),
        habits: goal.habits.map((habit) => ({
          id: habit.id,
          name: habit.name,
        })),
      }}
      projects={projects}
      timezone={timezone}
    />
  );
}
