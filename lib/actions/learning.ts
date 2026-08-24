"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  createLearningSchema,
  updateLearningProgressSchema,
  updateLearningSchema,
} from "@/lib/validations/entities";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import { deriveLearningState, normalizeResourceUrl } from "@/lib/learning/state";
import type { ActionResult } from "@/types";

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function assertOwnedLinks(userId: string, projectId?: string, goalId?: string) {
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

export async function createLearningAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createLearningSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    type: formData.get("type") || "COURSE",
    status: formData.get("status") || undefined,
    url: formData.get("url") || "",
    provider: formData.get("provider") || undefined,
    progress: formData.get("progress") || undefined,
    targetDate: formData.get("targetDate") || "",
    projectId: formData.get("projectId") || undefined,
    goalId: formData.get("goalId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not add this." };
  }

  const owned = await assertOwnedLinks(user.id, parsed.data.projectId, parsed.data.goalId);
  if (owned) return owned;

  const state = deriveLearningState({
    status: parsed.data.status,
    progress: parsed.data.progress,
  });

  try {
    const item = await prisma.learningItem.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        type: parsed.data.type ?? "COURSE",
        status: state.status,
        url: normalizeResourceUrl(parsed.data.url),
        provider: parsed.data.provider ?? null,
        progress: state.progress,
        targetDate: optionalDate(parsed.data.targetDate),
        completedAt: state.completedAt,
        projectId: parsed.data.projectId ?? null,
        goalId: parsed.data.goalId ?? null,
      },
      select: { id: true },
    });
    revalidateWorkspace([`/learning/${item.id}`]);
    return { ok: true, data: item };
  } catch {
    return { ok: false, error: "Could not save that. Try again." };
  }
}

export async function updateLearningAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateLearningSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    type: formData.get("type") || "COURSE",
    status: formData.get("status") || "NOT_STARTED",
    url: formData.get("url") || "",
    provider: formData.get("provider") || undefined,
    progress: formData.get("progress") || undefined,
    targetDate: formData.get("targetDate") || "",
    projectId: formData.get("projectId") || undefined,
    goalId: formData.get("goalId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update this." };
  }

  const existing = await prisma.learningItem.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true, status: true, progress: true },
  });
  if (!existing) return { ok: false, error: "Not found." };

  const owned = await assertOwnedLinks(user.id, parsed.data.projectId, parsed.data.goalId);
  if (owned) return owned;

  const state = deriveLearningState({
    status: parsed.data.status,
    progress: parsed.data.progress,
    previousStatus: existing.status,
    previousProgress: existing.progress,
  });

  try {
    await prisma.learningItem.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        type: parsed.data.type ?? "COURSE",
        status: state.status,
        url: normalizeResourceUrl(parsed.data.url),
        provider: parsed.data.provider ?? null,
        progress: state.progress,
        targetDate: optionalDate(parsed.data.targetDate),
        completedAt: state.status === "COMPLETED" ? (state.completedAt ?? new Date()) : null,
        projectId: parsed.data.projectId ?? null,
        goalId: parsed.data.goalId ?? null,
      },
    });
    revalidateWorkspace([`/learning/${existing.id}`]);
    return { ok: true, data: { id: existing.id } };
  } catch {
    return { ok: false, error: "Could not save that. Try again." };
  }
}

export async function updateLearningProgressAction(
  formData: FormData
): Promise<ActionResult<{ progress: number; status: string }>> {
  const user = await requireUser();
  const parsed = updateLearningProgressSchema.safeParse({
    id: formData.get("id"),
    progress: formData.get("progress"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update progress." };
  }

  const existing = await prisma.learningItem.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true, status: true, progress: true },
  });
  if (!existing) return { ok: false, error: "Not found." };

  const state = deriveLearningState({
    progress: parsed.data.progress,
    previousStatus: existing.status,
    previousProgress: existing.progress,
  });

  try {
    await prisma.learningItem.update({
      where: { id: existing.id },
      data: {
        progress: state.progress,
        status: state.status,
        completedAt: state.status === "COMPLETED" ? new Date() : null,
      },
    });
    revalidateWorkspace([`/learning/${existing.id}`]);
    return { ok: true, data: { progress: state.progress, status: state.status } };
  } catch {
    return { ok: false, error: "Could not update progress. Try again." };
  }
}

export async function deleteLearningAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.learningItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Not found." };

  try {
    await prisma.learningItem.delete({ where: { id: existing.id } });
    revalidateWorkspace();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete that. Try again." };
  }
}
