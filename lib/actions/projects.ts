"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createProjectSchema, updateProjectSchema } from "@/lib/validations/entities";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import type { ActionResult } from "@/types";

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createProjectAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    status: formData.get("status") || "ACTIVE",
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
    startDate: formData.get("startDate") || "",
    dueDate: formData.get("dueDate") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create project." };
  }

  try {
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        status: parsed.data.status ?? "ACTIVE",
        color: parsed.data.color ?? null,
        icon: parsed.data.icon ?? null,
        startDate: optionalDate(parsed.data.startDate),
        dueDate: optionalDate(parsed.data.dueDate),
      },
      select: { id: true },
    });

    revalidateWorkspace([`/projects/${project.id}`]);
    return { ok: true, data: project };
  } catch {
    return { ok: false, error: "Could not create the project. Try again." };
  }
}

export async function updateProjectAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateProjectSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || "",
    status: formData.get("status") || "ACTIVE",
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
    startDate: formData.get("startDate") || "",
    dueDate: formData.get("dueDate") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update project." };
  }

  const existing = await prisma.project.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return { ok: false, error: "Project not found." };
  }

  try {
    await prisma.project.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        status: parsed.data.status ?? "ACTIVE",
        color: parsed.data.color ?? null,
        icon: parsed.data.icon ?? null,
        startDate: optionalDate(parsed.data.startDate),
        dueDate: optionalDate(parsed.data.dueDate),
      },
    });
    revalidateWorkspace([`/projects/${existing.id}`]);
    return { ok: true, data: { id: existing.id } };
  } catch {
    return { ok: false, error: "Could not save the project. Try again." };
  }
}
