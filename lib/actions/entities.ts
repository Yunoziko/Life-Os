"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  createEventSchema,
  createGoalSchema,
  createHabitSchema,
  createNoteSchema,
  createProjectSchema,
  createTaskSchema,
} from "@/lib/validations/entities";
import { calendarDate, utcMidnightFromCalendarDate } from "@/lib/utils/date";
import type { TaskPriority } from "@/generated/prisma/enums";
import type { ActionResult } from "@/types";

function revalidateWorkspace() {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/goals");
  revalidatePath("/notes");
  revalidatePath("/projects");
  revalidatePath("/calendar");
  revalidatePath("/habits");
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
      priority: (parsed.data.priority as TaskPriority | undefined) ?? "NONE",
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

export async function createHabitAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createHabitSchema.safeParse({
    name: formData.get("name"),
    frequency: formData.get("frequency") || "DAILY",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create habit." };
  }

  const habit = await prisma.habit.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
    },
    select: { id: true },
  });

  revalidateWorkspace();
  return { ok: true, data: habit };
}

export async function toggleHabitAction(habitId: string): Promise<ActionResult<{ completed: boolean }>> {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const date = utcMidnightFromCalendarDate(calendarDate(timezone));

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id, archived: false },
    select: { id: true },
  });

  if (!habit) {
    return { ok: false, error: "Habit not found." };
  }

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: habit.id, date } },
  });

  if (existing?.completed) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
    revalidateWorkspace();
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

  revalidateWorkspace();
  return { ok: true, data: { completed: true } };
}

export async function createEventAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    allDay: formData.get("allDay") === "on" ? "on" : undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not create event." };
  }

  const allDay = parsed.data.allDay === "on";
  const startAt = new Date(parsed.data.startAt);
  const endAt = parsed.data.endAt ? new Date(parsed.data.endAt) : null;

  if (Number.isNaN(startAt.getTime())) {
    return { ok: false, error: "Choose a valid start time." };
  }

  if (endAt && Number.isNaN(endAt.getTime())) {
    return { ok: false, error: "Choose a valid end time." };
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      startAt,
      endAt,
      allDay,
    },
    select: { id: true },
  });

  revalidateWorkspace();
  return { ok: true, data: event };
}
