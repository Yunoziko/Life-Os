"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { searchSchema } from "@/lib/validations/entities";
import { formatShortDate } from "@/lib/utils/date";
import type { SearchResult } from "@/types";

export async function searchEverything(query: string): Promise<SearchResult[]> {
  const user = await requireUser();
  const parsed = searchSchema.safeParse({ query });

  if (!parsed.success) {
    return [];
  }

  const q = parsed.data.query;
  const timezone = user.profile?.timezone ?? "UTC";

  const [tasks, goals, projects, notes, events] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId: user.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.goal.findMany({
      where: {
        userId: user.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.note.findMany({
      where: {
        userId: user.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId: user.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { startAt: "asc" },
    }),
  ]);

  return [
    ...tasks.map((task) => ({
      id: task.id,
      type: "task" as const,
      title: task.title,
      subtitle: task.dueAt ? `Due ${formatShortDate(task.dueAt, timezone)}` : "Task",
      href: `/tasks/${task.id}`,
    })),
    ...goals.map((goal) => ({
      id: goal.id,
      type: "goal" as const,
      title: goal.title,
      subtitle: "Goal",
      href: `/goals/${goal.id}`,
    })),
    ...projects.map((project) => ({
      id: project.id,
      type: "project" as const,
      title: project.name,
      subtitle: "Project",
      href: `/projects/${project.id}`,
    })),
    ...notes.map((note) => ({
      id: note.id,
      type: "note" as const,
      title: note.title,
      subtitle: "Note",
      href: "/notes",
    })),
    ...events.map((event) => ({
      id: event.id,
      type: "event" as const,
      title: event.title,
      subtitle: formatShortDate(event.startAt, timezone),
      href: "/calendar",
    })),
  ];
}
