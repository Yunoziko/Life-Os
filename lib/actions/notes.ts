"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createNoteSchema, updateNoteSchema } from "@/lib/validations/entities";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import { notePreview, parseTags } from "@/lib/notes/preview";
import type { ActionResult } from "@/types";

async function assertOwnedRelation(userId: string, projectId?: string, goalId?: string) {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) return { ok: false, error: "That project isn’t in your workspace." } as const;
  }
  if (goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: { id: true },
    });
    if (!goal) return { ok: false, error: "That goal isn’t in your workspace." } as const;
  }
  return null;
}

export async function createNoteAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createNoteSchema.safeParse({
    title: formData.get("title") || "Untitled",
    content: formData.get("content") || "",
    projectId: formData.get("projectId") || undefined,
    goalId: formData.get("goalId") || undefined,
    tags: formData.get("tags") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create note." };
  }

  const owned = await assertOwnedRelation(user.id, parsed.data.projectId, parsed.data.goalId);
  if (owned) return owned;

  try {
    const content = parsed.data.content ?? "";
    const note = await prisma.note.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        content,
        preview: notePreview(content),
        projectId: parsed.data.projectId ?? null,
        goalId: parsed.data.goalId ?? null,
        tags: parseTags(parsed.data.tags),
      },
      select: { id: true },
    });
    revalidateWorkspace([`/notes/${note.id}`]);
    return { ok: true, data: note };
  } catch {
    return { ok: false, error: "Could not create the note. Try again." };
  }
}

export async function createBlankNoteAction(): Promise<ActionResult<{ id: string }>> {
  const data = new FormData();
  data.set("title", "Untitled");
  return createNoteAction(data);
}

export async function updateNoteAction(formData: FormData): Promise<ActionResult<{ id: string; updatedAt: string }>> {
  const user = await requireUser();
  const parsed = updateNoteSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title") || "Untitled",
    content: formData.get("content") || "",
    projectId: formData.get("projectId") || undefined,
    goalId: formData.get("goalId") || undefined,
    tags: formData.get("tags") || "",
    pinned: formData.get("pinned") || undefined,
    archived: formData.get("archived") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not save note." };
  }

  const existing = await prisma.note.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Note not found." };

  const owned = await assertOwnedRelation(user.id, parsed.data.projectId, parsed.data.goalId);
  if (owned) return owned;

  try {
    const content = parsed.data.content ?? "";
    const note = await prisma.note.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title.trim() || "Untitled",
        content,
        preview: notePreview(content),
        projectId: parsed.data.projectId ?? null,
        goalId: parsed.data.goalId ?? null,
        tags: parseTags(parsed.data.tags),
        ...(parsed.data.pinned ? { pinned: parsed.data.pinned === "true" } : {}),
        ...(parsed.data.archived ? { archived: parsed.data.archived === "true" } : {}),
      },
      select: { id: true, updatedAt: true },
    });
    revalidateWorkspace([`/notes/${note.id}`]);
    return { ok: true, data: { id: note.id, updatedAt: note.updatedAt.toISOString() } };
  } catch {
    return { ok: false, error: "Could not save the note. Try again." };
  }
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  const user = await requireUser();
  const note = await prisma.note.findFirst({
    where: { id: noteId, userId: user.id },
    select: { id: true },
  });
  if (!note) return { ok: false, error: "Note not found." };

  try {
    await prisma.note.delete({ where: { id: note.id } });
    revalidateWorkspace();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the note. Try again." };
  }
}
