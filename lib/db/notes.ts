import { prisma } from "@/lib/db/prisma";

const listSelect = {
  id: true,
  title: true,
  preview: true,
  tags: true,
  pinned: true,
  archived: true,
  projectId: true,
  goalId: true,
  updatedAt: true,
  createdAt: true,
  project: { select: { id: true, name: true } },
  goal: { select: { id: true, title: true } },
} as const;

export async function getNotesOverview(userId: string, query?: string) {
  const notes = await prisma.note.findMany({
    where: {
      userId,
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { preview: { contains: query, mode: "insensitive" } },
              { tags: { has: query } },
              { content: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: listSelect,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 80,
  });

  return notes;
}

export async function getNoteWorkspace(userId: string, id: string) {
  return prisma.note.findFirst({
    where: { id, userId },
    include: {
      project: { select: { id: true, name: true } },
      goal: { select: { id: true, title: true } },
    },
  });
}

export async function getRelatedNotes(userId: string, filters: { projectId?: string; goalId?: string }) {
  return prisma.note.findMany({
    where: {
      userId,
      archived: false,
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.goalId ? { goalId: filters.goalId } : {}),
    },
    select: {
      id: true,
      title: true,
      preview: true,
      updatedAt: true,
      pinned: true,
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 8,
  });
}

export type NoteOverview = Awaited<ReturnType<typeof getNotesOverview>>[number];
export type NoteWorkspace = NonNullable<Awaited<ReturnType<typeof getNoteWorkspace>>>;
export type RelatedNote = Awaited<ReturnType<typeof getRelatedNotes>>[number];
