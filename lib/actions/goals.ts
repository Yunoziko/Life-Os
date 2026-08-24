"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  createGoalSchema,
  updateGoalProgressSchema,
  updateGoalSchema,
} from "@/lib/validations/entities";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import { resolveGoalProgress } from "@/lib/utils/progress";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { entitlementActionError } from "@/lib/billing/action";
import type { ActionResult } from "@/types";

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function assertOwnedProject(userId: string, projectId?: string) {
  if (!projectId) return null;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  return project ? null : ({ ok: false, error: "That project isn’t in your workspace." } as const);
}

export async function createGoalAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    category: formData.get("category") || undefined,
    priority: formData.get("priority") || "MEDIUM",
    status: formData.get("status") || "ACTIVE",
    targetDate: formData.get("targetDate") || "",
    projectId: formData.get("projectId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create goal." };
  }

  const owned = await assertOwnedProject(user.id, parsed.data.projectId);
  if (owned) return owned;

  const milestoneTitles = formData
    .getAll("milestoneTitle")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 8);

  try {
    await assertWithinLimit(user.id, "GOALS");
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category ?? null,
        priority: parsed.data.priority ?? "MEDIUM",
        status: parsed.data.status ?? "ACTIVE",
        targetDate: optionalDate(parsed.data.targetDate),
        milestones: milestoneTitles.length
          ? {
              create: milestoneTitles.map((title) => ({
                userId: user.id,
                title,
              })),
            }
          : undefined,
      },
      select: { id: true },
    });

    if (parsed.data.projectId) {
      await prisma.project.updateMany({
        where: { id: parsed.data.projectId, userId: user.id },
        data: { goalId: goal.id },
      });
    }

    revalidateWorkspace([`/goals/${goal.id}`]);
    return { ok: true, data: goal };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: "Could not create the goal. Try again." };
  }
}

export async function updateGoalAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateGoalSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    category: formData.get("category") || undefined,
    priority: formData.get("priority") || "MEDIUM",
    status: formData.get("status") || "ACTIVE",
    targetDate: formData.get("targetDate") || "",
    projectId: formData.get("projectId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update goal." };
  }

  const existing = await prisma.goal.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return { ok: false, error: "Goal not found." };
  }

  const owned = await assertOwnedProject(user.id, parsed.data.projectId);
  if (owned) return owned;

  try {
    await prisma.goal.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category ?? null,
        priority: parsed.data.priority ?? "MEDIUM",
        status: parsed.data.status ?? "ACTIVE",
        targetDate: optionalDate(parsed.data.targetDate),
      },
    });

    if (parsed.data.projectId) {
      await prisma.project.updateMany({
        where: { id: parsed.data.projectId, userId: user.id },
        data: { goalId: existing.id },
      });
    }

    revalidateWorkspace([`/goals/${existing.id}`]);
    return { ok: true, data: { id: existing.id } };
  } catch {
    return { ok: false, error: "Could not save the goal. Try again." };
  }
}

export async function updateGoalProgressAction(
  formData: FormData
): Promise<ActionResult<{ progress: number; source: string }>> {
  const user = await requireUser();
  const parsed = updateGoalProgressSchema.safeParse({
    id: formData.get("id"),
    progress: formData.get("progress"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update progress." };
  }

  const goal = await prisma.goal.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    include: {
      milestones: { select: { completed: true } },
      tasks: { where: { status: { not: "CANCELLED" } }, select: { status: true } },
    },
  });

  if (!goal) {
    return { ok: false, error: "Goal not found." };
  }

  const resolved = resolveGoalProgress({
    manual: parsed.data.progress,
    milestones: goal.milestones,
    tasks: goal.tasks,
  });

  if (resolved.source !== "manual") {
    return {
      ok: false,
      error:
        resolved.source === "milestones"
          ? "Progress is calculated from milestones."
          : "Progress is calculated from related tasks.",
    };
  }

  try {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { progress: parsed.data.progress },
    });
    revalidateWorkspace([`/goals/${goal.id}`]);
    return { ok: true, data: { progress: parsed.data.progress, source: "manual" } };
  } catch {
    return { ok: false, error: "Could not update progress. Try again." };
  }
}

export async function deleteGoalAction(goalId: string): Promise<ActionResult> {
  const user = await requireUser();
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: user.id },
    select: { id: true },
  });

  if (!goal) {
    return { ok: false, error: "Goal not found." };
  }

  try {
    await prisma.goal.delete({ where: { id: goal.id } });
    revalidateWorkspace();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the goal. Try again." };
  }
}
