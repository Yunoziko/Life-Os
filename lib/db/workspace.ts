import { prisma } from "@/lib/db/prisma";

export function getTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId, status: { not: "CANCELLED" } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 40,
  });
}

export function getGoals(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 40,
  });
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
      project: { select: { id: true, name: true } },
      goal: { select: { id: true, title: true } },
    },
  });
}

export function getGoalById(userId: string, id: string) {
  return prisma.goal.findFirst({
    where: { id, userId },
    include: {
      tasks: {
        where: { status: { not: "CANCELLED" } },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        take: 20,
      },
      projects: {
        where: { status: { not: "ARCHIVED" } },
        take: 8,
      },
    },
  });
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
