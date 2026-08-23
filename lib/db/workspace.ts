import { prisma } from "@/lib/db/prisma";
import { resolveGoalProgress } from "@/lib/utils/progress";

export function getTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId, status: { not: "CANCELLED" } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 40,
  });
}

export async function getGoals(userId: string) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: {
      milestones: { select: { completed: true } },
      tasks: {
        where: { status: { not: "CANCELLED" } },
        select: { status: true },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 40,
  });

  return goals.map((goal) => ({
    ...goal,
    progress: resolveGoalProgress({
      manual: goal.progress,
      milestones: goal.milestones,
      tasks: goal.tasks,
    }).percent,
  }));
}

export function getProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 40,
  });
}

export function getNotes(userId: string) {
  return prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
}

export function getHabits(userId: string) {
  return prisma.habit.findMany({
    where: { userId, archived: false },
    include: {
      logs: {
        orderBy: { date: "desc" },
        take: 14,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getTaskById(userId: string, id: string) {
  return prisma.task.findFirst({
    where: { id, userId },
    include: {
      project: { select: { id: true, name: true, color: true } },
      goal: { select: { id: true, title: true } },
    },
  });
}

export async function getGoalById(userId: string, id: string) {
  const goal = await prisma.goal.findFirst({
    where: { id, userId },
    include: {
      milestones: { orderBy: { createdAt: "asc" } },
      tasks: {
        where: { status: { not: "CANCELLED" } },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      },
      projects: {
        where: { status: { not: "ARCHIVED" } },
        take: 8,
      },
    },
  });

  if (!goal) return null;

  return {
    ...goal,
    progress: resolveGoalProgress({
      manual: goal.progress,
      milestones: goal.milestones,
      tasks: goal.tasks,
    }).percent,
  };
}

export function getUpcomingEvents(userId: string) {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    take: 20,
  });
}
