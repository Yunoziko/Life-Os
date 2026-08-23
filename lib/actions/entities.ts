"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  createGoalSchema,
  createNoteSchema,
  createProjectSchema,
  createTaskSchema,
} from "@/lib/validations/entities";
import type { ActionResult } from "@/types";

function revalidateWorkspace() {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/goals");
  revalidatePath("/notes");
  revalidatePath("/projects");
  revalidatePath("/calendar");
}

export async function createTaskAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueAt: formData.get("dueAt"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create task." };
  }

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
    select: { id: true },
  });

  revalidateWorkspace();
  return { ok: true, data: task };
}

export async function createNoteAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createNoteSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create note." };
  }

  const note = await prisma.note.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      content: parsed.data.content ?? "",
    },
    select: { id: true },
  });

  revalidateWorkspace();
  return { ok: true, data: note };
}

export async function createGoalAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    targetDate: formData.get("targetDate"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create goal." };
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
    },
    select: { id: true },
  });

  revalidateWorkspace();
  return { ok: true, data: goal };
}

export async function createProjectAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create project." };
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
    select: { id: true },
  });

  revalidateWorkspace();
  return { ok: true, data: project };
}

export async function completeTaskAction(taskId: string): Promise<ActionResult> {
  const user = await requireUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
    select: { id: true, status: true },
  });

  if (!task) {
    return { ok: false, error: "Task not found." };
  }

  await prisma.task.update({
    where: { id: task.id },
    data:
      task.status === "DONE"
        ? { status: "TODO", completedAt: null }
        : { status: "DONE", completedAt: new Date() },
  });

  revalidateWorkspace();
  return { ok: true };
}
