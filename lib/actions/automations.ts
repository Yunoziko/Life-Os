"use server";

import { requireUser } from "@/lib/auth/session";
import { assertCanUseFeature } from "@/lib/billing/entitlements";
import { entitlementActionError } from "@/lib/billing/action";
import { EntitlementError } from "@/lib/billing/errors";
import { MAX_AUTOMATIONS_PER_USER } from "@/lib/agents/types";
import {
  countAutomations,
  createAutomationRecord,
  getOwnedAutomation,
  updateAutomationRecord,
} from "@/lib/db/automations";
import { prisma } from "@/lib/db/prisma";
import { runAutomation } from "@/lib/automations/runner";
import { templateById } from "@/lib/automations/templates";
import { nextScheduledAt, type AutomationSchedule } from "@/lib/automations/schedule";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import type { ActionResult } from "@/types";

async function requirePro(userId: string) {
  await assertCanUseFeature(userId, "AUTOMATION");
}

function parseSchedule(form: FormData, timeZone: string): AutomationSchedule | null {
  const frequency = String(form.get("frequency") || "");
  if (frequency !== "DAILY" && frequency !== "WEEKLY" && frequency !== "MONTHLY") return null;
  return {
    frequency,
    time: String(form.get("time") || "08:00"),
    weekday: form.get("weekday") ? Number(form.get("weekday")) : undefined,
    monthDay: form.get("monthDay") ? Number(form.get("monthDay")) : undefined,
    timeZone,
  };
}

export async function createAutomationFromTemplateAction(
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    await requirePro(user.id);
    const template = templateById(templateId);
    if (!template) return { ok: false, error: "That template isn’t available." };
    const count = await countAutomations(user.id);
    if (count >= MAX_AUTOMATIONS_PER_USER) {
      return { ok: false, error: "You’ve reached the automation limit for this workspace." };
    }
    const timeZone = user.profile?.timezone ?? "UTC";
    const schedule =
      template.schedule ? { ...template.schedule, timeZone } : null;
    const created = await createAutomationRecord({
      userId: user.id,
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      actionType: template.actionType,
      schedule,
      eventType: template.eventType ?? null,
      actionConfig: { objective: template.objective, templateId: template.id },
    });
    revalidateWorkspace(["/automations"]);
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: "Could not create that automation." };
  }
}

export async function createAutomationAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    await requirePro(user.id);
    const count = await countAutomations(user.id);
    if (count >= MAX_AUTOMATIONS_PER_USER) {
      return { ok: false, error: "You’ve reached the automation limit for this workspace." };
    }
    const name = String(formData.get("name") || "").trim().slice(0, 80);
    const objective = String(formData.get("objective") || "").trim().slice(0, 240);
    const triggerType = String(formData.get("triggerType") || "SCHEDULE");
    if (!name || !objective) return { ok: false, error: "Give the automation a name and an action." };
    if (triggerType !== "MANUAL" && triggerType !== "SCHEDULE" && triggerType !== "EVENT") {
      return { ok: false, error: "Choose a valid trigger." };
    }
    const timeZone = user.profile?.timezone ?? "UTC";
    const schedule = triggerType === "SCHEDULE" ? parseSchedule(formData, timeZone) : null;
    if (triggerType === "SCHEDULE" && !schedule) {
      return { ok: false, error: "Choose how often this should run." };
    }
    const eventType = triggerType === "EVENT" ? String(formData.get("eventType") || "PROJECT_CREATED") : null;
    const created = await createAutomationRecord({
      userId: user.id,
      name,
      description: String(formData.get("description") || "").trim() || undefined,
      triggerType,
      actionType: "CUSTOM",
      schedule,
      eventType,
      actionConfig: { objective },
    });
    revalidateWorkspace(["/automations"]);
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: "Could not create that automation." };
  }
}

export async function toggleAutomationAction(
  id: string,
  enabled: boolean
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requirePro(user.id);
    const existing = await getOwnedAutomation(user.id, id);
    if (!existing) return { ok: false, error: "Automation not found." };
    const schedule = existing.schedule as AutomationSchedule | null;
    await updateAutomationRecord(user.id, id, {
      enabled,
      nextRunAt: enabled && existing.triggerType === "SCHEDULE" && schedule ? nextScheduledAt(schedule) : existing.nextRunAt,
    });
    revalidateWorkspace(["/automations", `/automations/${id}`]);
    return { ok: true };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: "Could not update that automation." };
  }
}

export async function pauseAllAutomationsAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requirePro(user.id);
    await prisma.automation.updateMany({
      where: { userId: user.id, enabled: true },
      data: { enabled: false },
    });
    revalidateWorkspace(["/automations"]);
    return { ok: true };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: "Could not pause automations." };
  }
}

export async function runAutomationNowAction(id: string): Promise<ActionResult<{ runId: string }>> {
  try {
    const user = await requireUser();
    await requirePro(user.id);
    const run = await runAutomation({
      automationId: id,
      userId: user.id,
      timeZone: user.profile?.timezone ?? "UTC",
      trigger: "MANUAL",
      idempotencyKey: `${id}:manual:${Date.now()}`,
    });
    if (!run) return { ok: false, error: "Could not start that automation." };
    return { ok: true, data: { runId: run.id } };
  } catch (error) {
    if (error instanceof EntitlementError) {
      return entitlementActionError(error) ?? { ok: false, error: error.message };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Could not run that automation." };
  }
}

export async function deleteAutomationAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requirePro(user.id);
    await prisma.automation.deleteMany({ where: { id, userId: user.id } });
    revalidateWorkspace(["/automations"]);
    return { ok: true };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: "Could not delete that automation." };
  }
}
