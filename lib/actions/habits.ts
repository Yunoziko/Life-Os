"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createHabitSchema, updateHabitSchema } from "@/lib/validations/entities";
import { calendarDate, utcMidnightFromCalendarDate } from "@/lib/utils/date";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { entitlementActionError } from "@/lib/billing/action";
import { fireWorkspaceEvent } from "@/lib/automations/events";
import type { ActionResult } from "@/types";

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function assertOwnedGoal(userId: string, goalId?: string) {
  if (!goalId) return null;
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  return goal ? null : ({ ok: false, error: "That goal isn’t in your workspace." } as const);
}

export async function createHabitAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createHabitSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    frequency: formData.get("frequency") || "DAILY",
    target: formData.get("target") || undefined,
    startDate: formData.get("startDate") || "",
    goalId: formData.get("goalId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create habit." };
  }

  const owned = await assertOwnedGoal(user.id, parsed.data.goalId);
  if (owned) return owned;

  try {
    await assertWithinLimit(user.id, "HABITS");
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        frequency: parsed.data.frequency,
        target: parsed.data.target ?? null,
        startDate: optionalDate(parsed.data.startDate),
        goalId: parsed.data.goalId ?? null,
      },
      select: { id: true },
    });
    revalidateWorkspace([`/habits/${habit.id}`]);
    return { ok: true, data: habit };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: "Could not create the habit. Try again." };
  }
}

export async function updateHabitAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateHabitSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || "",
    frequency: formData.get("frequency") || "DAILY",
    target: formData.get("target") || undefined,
    startDate: formData.get("startDate") || "",
    goalId: formData.get("goalId") || undefined,
    paused: formData.get("paused") || undefined,
    archived: formData.get("archived") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not update habit." };
  }

  const existing = await prisma.habit.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return { ok: false, error: "Habit not found." };
  }

  const owned = await assertOwnedGoal(user.id, parsed.data.goalId);
  if (owned) return owned;

  try {
    await prisma.habit.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        frequency: parsed.data.frequency,
        target: parsed.data.target ?? null,
        startDate: optionalDate(parsed.data.startDate),
        goalId: parsed.data.goalId ?? null,
        ...(parsed.data.paused ? { paused: parsed.data.paused === "true" } : {}),
        ...(parsed.data.archived ? { archived: parsed.data.archived === "true" } : {}),
      },
    });
    revalidateWorkspace([`/habits/${existing.id}`]);
    return { ok: true, data: { id: existing.id } };
  } catch {
    return { ok: false, error: "Could not save the habit. Try again." };
  }
}

export async function toggleHabitAction(
  habitId: string
): Promise<ActionResult<{ completed: boolean }>> {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const date = utcMidnightFromCalendarDate(calendarDate(timezone));

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id, archived: false, paused: false },
    select: { id: true },
  });

  if (!habit) {
    return { ok: false, error: "Habit not found." };
  }

  try {
    const existing = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId: habit.id, date } },
    });

    if (existing?.completed) {
      await prisma.habitLog.delete({ where: { id: existing.id } });
      revalidateWorkspace([`/habits/${habit.id}`]);
      return { ok: true, data: { completed: false } };
    }

    if (existing) {
      await prisma.habitLog.update({
        where: { id: existing.id },
        data: { completed: true },
      });
    } else {
      await prisma.habitLog.create({
        data: {
          userId: user.id,
          habitId: habit.id,
          date,
          completed: true,
        },
      });
    }

    revalidateWorkspace([`/habits/${habit.id}`]);
    fireWorkspaceEvent({
      userId: user.id,
      timeZone: timezone,
      type: "HABIT_COMPLETED",
      entityId: habit.id,
    });
    return { ok: true, data: { completed: true } };
  } catch {
    return { ok: false, error: "Could not update the habit. Try again." };
  }
}

export async function deleteHabitAction(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id },
    select: { id: true },
  });

  if (!habit) {
    return { ok: false, error: "Habit not found." };
  }

  try {
    await prisma.habit.delete({ where: { id: habit.id } });
    revalidateWorkspace();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the habit. Try again." };
  }
}
