import { prisma } from "@/lib/db/prisma";
import { calculateTaskProgress } from "@/lib/utils/progress";

export async function getProjectsOverview(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      tasks: {
        where: { status: { not: "CANCELLED" } },
        select: { status: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const statusRank: Record<string, number> = {
    ACTIVE: 0,
    PLANNED: 1,
    ON_HOLD: 2,
    COMPLETED: 3,
    ARCHIVED: 4,
  };

  return projects
    .map((project) => {
      const progress = calculateTaskProgress(project.tasks);
      const active = project.tasks.filter(
        (task) => task.status === "TODO" || task.status === "IN_PROGRESS"
      ).length;
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        color: project.color,
        icon: project.icon,
        startDate: project.startDate,
        dueDate: project.dueDate,
        active,
        ...progress,
      };
    })
    .sort((a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9));
}

export async function getProjectWorkspace(userId: string, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      goal: { select: { id: true, title: true } },
      tasks: {
        include: {
          project: { select: { id: true, name: true, color: true } },
          goal: { select: { id: true, title: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!project) return null;

  const progress = calculateTaskProgress(project.tasks);
  return { ...project, ...progress };
}

export type ProjectOverview = Awaited<ReturnType<typeof getProjectsOverview>>[number];
