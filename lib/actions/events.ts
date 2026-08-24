"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createEventSchema, updateEventSchema } from "@/lib/validations/entities";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import { zonedDateTime } from "@/lib/utils/date";
import type { ActionResult } from "@/types";

function isAllDay(value?: string) {
  return value === "true" || value === "on";
}

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

function resolveTimes(
  data: {
    date?: string;
    startTime?: string;
    endTime?: string;
    startAt?: string;
    endAt?: string;
    allDay?: string;
  },
  timeZone: string
) {
  const allDay = isAllDay(data.allDay);

  if (data.startAt) {
    const startAt = new Date(data.startAt);
    const endAt = data.endAt ? new Date(data.endAt) : null;
    return { startAt, endAt, allDay };
  }

  if (!data.date) {
    return { startAt: null, endAt: null, allDay };
  }

  const startAt = zonedDateTime(data.date, allDay ? "00:00" : (data.startTime || "09:00"), timeZone);
  const endAt = allDay
    ? zonedDateTime(data.date, "23:59", timeZone)
    : data.endTime
      ? zonedDateTime(data.date, data.endTime, timeZone)
      : null;

  return { startAt, endAt, allDay };
}

export async function createEventAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    date: formData.get("date") || "",
    startTime: formData.get("startTime") || "",
    endTime: formData.get("endTime") || "",
    startAt: formData.get("startAt") || "",
    endAt: formData.get("endAt") || "",
    allDay: formData.get("allDay") || undefined,
    location: formData.get("location") || undefined,
    color: formData.get("color") || undefined,
    projectId: formData.get("projectId") || undefined,
    goalId: formData.get("goalId") || undefined,
    recurrence: formData.get("recurrence") || undefined,
    reminderMinutes: formData.get("reminderMinutes") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create event." };
  }

  const owned = await assertOwnedRelation(user.id, parsed.data.projectId, parsed.data.goalId);
  if (owned) return owned;

  const timeZone = user.profile?.timezone ?? "UTC";
  const times = resolveTimes(parsed.data, timeZone);
  if (!times.startAt || Number.isNaN(times.startAt.getTime())) {
    return { ok: false, error: "Choose a valid start time." };
  }
  if (times.endAt && Number.isNaN(times.endAt.getTime())) {
    return { ok: false, error: "Choose a valid end time." };
  }
  if (times.endAt && times.endAt < times.startAt) {
    return { ok: false, error: "End time needs to be after the start." };
  }

  try {
    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        startAt: times.startAt,
        endAt: times.endAt,
        allDay: times.allDay,
        location: parsed.data.location ?? null,
        color: parsed.data.color ?? null,
        projectId: parsed.data.projectId ?? null,
        goalId: parsed.data.goalId ?? null,
        recurrence: parsed.data.recurrence ?? null,
        reminderMinutes: parsed.data.reminderMinutes ?? null,
      },
      select: { id: true },
    });
    revalidateWorkspace();
    return { ok: true, data: event };
  } catch {
    return { ok: false, error: "Could not create the event. Try again." };
  }
}

export async function updateEventAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateEventSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    date: formData.get("date") || "",
    startTime: formData.get("startTime") || "",
    endTime: formData.get("endTime") || "",
    startAt: formData.get("startAt") || "",
    endAt: formData.get("endAt") || "",
    allDay: formData.get("allDay") || undefined,
    location: formData.get("location") || undefined,
    color: formData.get("color") || undefined,
    projectId: formData.get("projectId") || undefined,
    goalId: formData.get("goalId") || undefined,
    recurrence: formData.get("recurrence") || undefined,
    reminderMinutes: formData.get("reminderMinutes") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update event." };
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Event not found." };

  const owned = await assertOwnedRelation(user.id, parsed.data.projectId, parsed.data.goalId);
  if (owned) return owned;

  const timeZone = user.profile?.timezone ?? "UTC";
  const times = resolveTimes(parsed.data, timeZone);
  if (!times.startAt || Number.isNaN(times.startAt.getTime())) {
    return { ok: false, error: "Choose a valid start time." };
  }
  if (times.endAt && times.endAt < times.startAt) {
    return { ok: false, error: "End time needs to be after the start." };
  }

  try {
    await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        startAt: times.startAt,
        endAt: times.endAt,
        allDay: times.allDay,
        location: parsed.data.location ?? null,
        color: parsed.data.color ?? null,
        projectId: parsed.data.projectId ?? null,
        goalId: parsed.data.goalId ?? null,
        recurrence: parsed.data.recurrence ?? null,
        reminderMinutes: parsed.data.reminderMinutes ?? null,
      },
    });
    revalidateWorkspace();
    return { ok: true, data: { id: existing.id } };
  } catch {
    return { ok: false, error: "Could not save the event. Try again." };
  }
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  const user = await requireUser();
  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return { ok: false, error: "Event not found." };

  try {
    await prisma.calendarEvent.delete({ where: { id: event.id } });
    revalidateWorkspace();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the event. Try again." };
  }
}
