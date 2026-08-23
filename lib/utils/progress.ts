export function calculateTaskProgress(tasks: { status: string }[]) {
  const countable = tasks.filter((task) => task.status !== "CANCELLED");
  const completed = countable.filter((task) => task.status === "DONE").length;
  const total = countable.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

export function calculateMilestoneProgress(milestones: { completed: boolean }[]) {
  const total = milestones.length;
  const completed = milestones.filter((milestone) => milestone.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

export type GoalProgressSource = "manual" | "milestones" | "tasks";

export function resolveGoalProgress(input: {
  manual?: number | null;
  milestones?: { completed: boolean }[];
  tasks?: { status: string }[];
}): { percent: number; source: GoalProgressSource } {
  const milestones = input.milestones ?? [];
  if (milestones.length > 0) {
    return { percent: calculateMilestoneProgress(milestones).percent, source: "milestones" };
  }

  const tasks = input.tasks ?? [];
  const taskProgress = calculateTaskProgress(tasks);
  if (taskProgress.total > 0) {
    return { percent: taskProgress.percent, source: "tasks" };
  }

  const manual = Math.min(100, Math.max(0, Math.round(input.manual ?? 0)));
  return { percent: manual, source: "manual" };
}
