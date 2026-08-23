"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createTaskSchema, updateTaskSchema } from "@/lib/validations/entities";
import { combineDueAt } from "@/lib/utils/due";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import type { ActionResult } from "@/types";

async function assertOwnedRelation(
  userId: string,
  projectId?: string,
  goalId?: string
): Promise<ActionResult | null> {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) return { ok: false, error: "That project isn’t in your workspace." };
  }
  if (goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: { id: true },
    });
    if (!goal) return { ok: false, error: "That goal isn’t in your workspace." };
  }
  return null;
}

function dueFromForm(
  data: { dueAt?: string; dueDate?: string; dueTime?: string },
  timeZone: string
) {
  if (data.dueDate) return combineDueAt(data.dueDate, data.dueTime, timeZone);
  if (data.dueAt) return new Date(data.dueAt);
  return null;
}

export async function createTaskAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    dueAt: formData.get("dueAt") || "",
    dueDate: formData.get("dueDate") || "",
    dueTime: formData.get("dueTime") || "",
    priority: formData.get("priority") || "NONE",
    status: formData.get("status") || "TODO",
    projectId: formData.get("projectId") || undefined,
    goalId: formData.get("goalId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create task." };
  }

  const owned = await assertOwnedRelation(user.id, parsed.data.projectId, parsed.data.goalId);
  if (owned) return owned;

  try {
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        priority: parsed.data.priority ?? "NONE",
        status: parsed.data.status ?? "TODO",
        dueAt: dueFromForm(parsed.data, user.profile?.timezone ?? "UTC"),
        projectId: parsed.data.projectId ?? null,
        goalId: parsed.data.goalId ?? null,
      },
      select: { id: true, projectId: true },
    });

    revalidateWorkspace(task.projectId ? [`/projects/${task.projectId}`] : []);
    return { ok: true, data: { id: task.id } };
  } catch {
    return { ok: false, error: "Could not create the task. Try again." };
  }
}

export async function updateTaskAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateTaskSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    dueDate: formData.get("dueDate") || "",
    dueTime: formData.get("dueTime") || "",
    priority: formData.get("priority") || "NONE",
    status: formData.get("status") || "TODO",
    projectId: formData.get("projectId") || undefined,
    goalId: formData.get("goalId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update task." };
  }

  const existing = await prisma.task.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true, projectId: true, status: true },
  });

  if (!existing) {
    return { ok: false, error: "Task not found." };
  }

  const owned = await assertOwnedRelation(user.id, parsed.data.projectId, parsed.data.goalId);
  if (owned) return owned;

  const nextStatus = parsed.data.status ?? existing.status;
  const completedAt =
    nextStatus === "DONE" && existing.status !== "DONE"
      ? new Date()
      : nextStatus !== "DONE"
        ? null
        : undefined;

  try {
    await prisma.task.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        priority: parsed.data.priority ?? "NONE",
        status: nextStatus,
        dueAt: dueFromForm(parsed.data, user.profile?.timezone ?? "UTC"),
        projectId: parsed.data.projectId ?? null,
        goalId: parsed.data.goalId ?? null,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    });

    revalidateWorkspace([
      `/tasks/${existing.id}`,
      existing.projectId ? `/projects/${existing.projectId}` : "",
      parsed.data.projectId ? `/projects/${parsed.data.projectId}` : "",
    ].filter(Boolean));
    return { ok: true, data: { id: existing.id } };
  } catch {
    return { ok: false, error: "Could not save the task. Try again." };
  }
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const user = await requireUser();
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
    select: { id: true, projectId: true },
  });

  if (!task) {
    return { ok: false, error: "Task not found." };
  }

  try {
    await prisma.task.delete({ where: { id: task.id } });
    revalidateWorkspace(task.projectId ? [`/projects/${task.projectId}`] : []);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the task. Try again." };
  }
}
