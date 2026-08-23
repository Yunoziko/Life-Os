import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

export const taskListInclude = {
  project: { select: { id: true, name: true, color: true } },
  goal: { select: { id: true, title: true } },
} as const;

export function getWorkspaceTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId },
    include: taskListInclude,
    orderBy: [{ createdAt: "desc" }],
    take: 250,
  });
}

export const getAssignableOptions = cache(function getAssignableOptions(userId: string) {
  return Promise.all([
    prisma.project.findMany({
      where: { userId, status: { not: "ARCHIVED" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);
});

export type WorkspaceTask = Awaited<ReturnType<typeof getWorkspaceTasks>>[number];
export type AssignableProject = Awaited<ReturnType<typeof getAssignableOptions>>[0][number];
export type AssignableGoal = Awaited<ReturnType<typeof getAssignableOptions>>[1][number];
