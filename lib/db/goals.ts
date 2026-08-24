import { prisma } from "@/lib/db/prisma";
import { resolveGoalProgress } from "@/lib/utils/progress";

const goalListInclude = {
  milestones: { select: { completed: true } },
  tasks: {
    where: { status: { not: "CANCELLED" } },
    select: { status: true },
  },
} as const;

export async function getGoalsOverview(userId: string) {
  const goals = await prisma.goal.findMany({
    where: { userId, status: { not: "ARCHIVED" } },
    include: goalListInclude,
    orderBy: [{ updatedAt: "desc" }],
    take: 80,
  });

  return goals.map((goal) => {
    const resolved = resolveGoalProgress({
      manual: goal.progress,
      milestones: goal.milestones,
      tasks: goal.tasks,
    });
    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      status: goal.status,
      priority: goal.priority,
      targetDate: goal.targetDate,
      progress: resolved.percent,
      source: resolved.source,
    };
  });
}

export async function getGoalWorkspace(userId: string, id: string) {
  const goal = await prisma.goal.findFirst({
    where: { id, userId },
    include: {
      milestones: { orderBy: [{ completed: "asc" }, { createdAt: "asc" }] },
      tasks: {
        where: { status: { not: "CANCELLED" } },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      },
      projects: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: { updatedAt: "desc" },
      },
      habits: {
        where: { archived: false },
        select: { id: true, name: true },
        take: 8,
      },
      notes: {
        where: { archived: false },
        select: { id: true, title: true, preview: true, updatedAt: true, pinned: true },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        take: 8,
      },
    },
  });

  if (!goal) return null;

  const resolved = resolveGoalProgress({
    manual: goal.progress,
    milestones: goal.milestones,
    tasks: goal.tasks,
  });

  return {
    ...goal,
    progress: resolved.percent,
    source: resolved.source,
  };
}

export type GoalOverview = Awaited<ReturnType<typeof getGoalsOverview>>[number];
export type GoalWorkspace = NonNullable<Awaited<ReturnType<typeof getGoalWorkspace>>>;
