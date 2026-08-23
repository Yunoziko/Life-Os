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
