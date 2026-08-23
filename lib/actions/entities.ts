"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createEventSchema, createNoteSchema } from "@/lib/validations/entities";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import {
  createTaskAction as persistTask,
  updateTaskAction as persistTaskUpdate,
  deleteTaskAction as persistTaskDelete,
} from "@/lib/actions/tasks";
import {
  createProjectAction as persistProject,
  updateProjectAction as persistProjectUpdate,
} from "@/lib/actions/projects";
import {
  createGoalAction as persistGoal,
  updateGoalAction as persistGoalUpdate,
  updateGoalProgressAction as persistGoalProgress,
  deleteGoalAction as persistGoalDelete,
} from "@/lib/actions/goals";
import {
  createMilestoneAction as persistMilestone,
  updateMilestoneAction as persistMilestoneUpdate,
  toggleMilestoneAction as persistMilestoneToggle,
  deleteMilestoneAction as persistMilestoneDelete,
} from "@/lib/actions/milestones";
import {
  createHabitAction as persistHabit,
  updateHabitAction as persistHabitUpdate,
  toggleHabitAction as persistHabitToggle,
  deleteHabitAction as persistHabitDelete,
} from "@/lib/actions/habits";
import type { ActionResult } from "@/types";

export async function createTaskAction(formData: FormData) {
  return persistTask(formData);
}

export async function updateTaskAction(formData: FormData) {
  return persistTaskUpdate(formData);
}

export async function deleteTaskAction(taskId: string) {
  return persistTaskDelete(taskId);
}

export async function createProjectAction(formData: FormData) {
  return persistProject(formData);
}

export async function updateProjectAction(formData: FormData) {
  return persistProjectUpdate(formData);
}

export async function createGoalAction(formData: FormData) {
  return persistGoal(formData);
}

export async function updateGoalAction(formData: FormData) {
  return persistGoalUpdate(formData);
}

export async function updateGoalProgressAction(formData: FormData) {
  return persistGoalProgress(formData);
}

export async function deleteGoalAction(goalId: string) {
  return persistGoalDelete(goalId);
}

export async function createMilestoneAction(formData: FormData) {
  return persistMilestone(formData);
}

export async function updateMilestoneAction(formData: FormData) {
  return persistMilestoneUpdate(formData);
}

export async function toggleMilestoneAction(milestoneId: string) {
  return persistMilestoneToggle(milestoneId);
}

export async function deleteMilestoneAction(milestoneId: string) {
  return persistMilestoneDelete(milestoneId);
}

export async function createHabitAction(formData: FormData) {
  return persistHabit(formData);
}

export async function updateHabitAction(formData: FormData) {
  return persistHabitUpdate(formData);
}

export async function toggleHabitAction(habitId: string) {
  return persistHabitToggle(habitId);
}

export async function deleteHabitAction(habitId: string) {
  return persistHabitDelete(habitId);
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


export async function completeTaskAction(taskId: string): Promise<ActionResult<{ done: boolean }>> {
  const user = await requireUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
    select: { id: true, status: true, projectId: true, goalId: true },
  });

  if (!task) {
    return { ok: false, error: "Task not found." };
  }

  try {
    const done = task.status !== "DONE";
    await prisma.task.update({
      where: { id: task.id },
      data: done
        ? { status: "DONE", completedAt: new Date() }
        : { status: "TODO", completedAt: null },
    });

    revalidateWorkspace([
      `/tasks/${task.id}`,
      task.projectId ? `/projects/${task.projectId}` : "",
      task.goalId ? `/goals/${task.goalId}` : "",
    ].filter(Boolean));
    return { ok: true, data: { done } };
  } catch {
    return { ok: false, error: "Could not update the task. Try again." };
  }
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
