import type { WorkspaceTask } from "@/lib/db/tasks";

export type ClientTask = Omit<
  WorkspaceTask,
  "dueAt" | "completedAt" | "createdAt" | "updatedAt"
> & {
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeTask(task: WorkspaceTask): ClientTask {
  return {
    ...task,
    dueAt: task.dueAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function serializeTasks(tasks: WorkspaceTask[]) {
  return tasks.map(serializeTask);
}
