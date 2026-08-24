"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createProjectSchema, updateProjectSchema } from "@/lib/validations/entities";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import { parseGitHubRepo } from "@/lib/integrations/github/client";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { entitlementActionError } from "@/lib/billing/action";
import { fireWorkspaceEvent } from "@/lib/automations/events";
import type { ActionResult } from "@/types";

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function githubRepoValue(value?: string) {
  if (!value?.trim()) return null;
  const parsed = parseGitHubRepo(value);
  return parsed;
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
    githubRepo: formData.get("githubRepo") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create project." };
  }

  if (parsed.data.githubRepo && !parseGitHubRepo(parsed.data.githubRepo)) {
    return { ok: false, error: "Use a GitHub repo like owner/name." };
  }

  try {
    await assertWithinLimit(user.id, "PROJECTS");
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
        githubRepo: githubRepoValue(parsed.data.githubRepo),
      },
      select: { id: true },
    });

    revalidateWorkspace([`/projects/${project.id}`]);
    fireWorkspaceEvent({
      userId: user.id,
      timeZone: user.profile?.timezone ?? "UTC",
      type: "PROJECT_CREATED",
      entityId: project.id,
      label: parsed.data.name,
    });
    return { ok: true, data: project };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: "Could not create the project. Try again." };
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
    githubRepo: formData.get("githubRepo") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update project." };
  }

  if (parsed.data.githubRepo && !parseGitHubRepo(parsed.data.githubRepo)) {
    return { ok: false, error: "Use a GitHub repo like owner/name." };
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
        githubRepo: githubRepoValue(parsed.data.githubRepo),
      },
    });
    revalidateWorkspace([`/projects/${existing.id}`]);
    return { ok: true, data: { id: existing.id } };
  } catch {
    return { ok: false, error: "Could not save the project. Try again." };
  }
}
