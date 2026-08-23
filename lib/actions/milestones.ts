"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createMilestoneSchema, updateMilestoneSchema } from "@/lib/validations/entities";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import type { ActionResult } from "@/types";

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createMilestoneAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createMilestoneSchema.safeParse({
    title: formData.get("title"),
    goalId: formData.get("goalId"),
    dueDate: formData.get("dueDate") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create milestone." };
  }

  const goal = await prisma.goal.findFirst({
    where: { id: parsed.data.goalId, userId: user.id },
    select: { id: true },
  });

  if (!goal) {
    return { ok: false, error: "That goal isn’t in your workspace." };
  }

  try {
    const milestone = await prisma.milestone.create({
      data: {
        userId: user.id,
        goalId: goal.id,
        title: parsed.data.title,
        dueDate: optionalDate(parsed.data.dueDate),
      },
      select: { id: true },
    });
    revalidateWorkspace([`/goals/${goal.id}`]);
    return { ok: true, data: milestone };
  } catch {
    return { ok: false, error: "Could not create the milestone. Try again." };
  }
}

export async function updateMilestoneAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateMilestoneSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title") || undefined,
    dueDate: formData.get("dueDate") || "",
    completed: formData.get("completed") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update milestone." };
  }

  const milestone = await prisma.milestone.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true, goalId: true },
  });

  if (!milestone) {
    return { ok: false, error: "Milestone not found." };
  }

  try {
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.dueDate !== undefined ? { dueDate: optionalDate(parsed.data.dueDate) } : {}),
        ...(parsed.data.completed ? { completed: parsed.data.completed === "true" } : {}),
      },
    });
    revalidateWorkspace([`/goals/${milestone.goalId}`]);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save the milestone. Try again." };
  }
}

export async function toggleMilestoneAction(
  milestoneId: string
): Promise<ActionResult<{ completed: boolean }>> {
  const user = await requireUser();
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, userId: user.id },
    select: { id: true, completed: true, goalId: true },
  });

  if (!milestone) {
    return { ok: false, error: "Milestone not found." };
  }

  try {
    const completed = !milestone.completed;
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: { completed },
    });
    revalidateWorkspace([`/goals/${milestone.goalId}`]);
    return { ok: true, data: { completed } };
  } catch {
    return { ok: false, error: "Could not update the milestone. Try again." };
  }
}

export async function deleteMilestoneAction(milestoneId: string): Promise<ActionResult> {
  const user = await requireUser();
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, userId: user.id },
    select: { id: true, goalId: true },
  });

  if (!milestone) {
    return { ok: false, error: "Milestone not found." };
  }

  try {
    await prisma.milestone.delete({ where: { id: milestone.id } });
    revalidateWorkspace([`/goals/${milestone.goalId}`]);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the milestone. Try again." };
  }
}
