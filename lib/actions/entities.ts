"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import {
  createEventAction as persistEvent,
  updateEventAction as persistEventUpdate,
  deleteEventAction as persistEventDelete,
} from "@/lib/actions/events";
import {
  createNoteAction as persistNote,
  createBlankNoteAction as persistBlankNote,
  updateNoteAction as persistNoteUpdate,
  deleteNoteAction as persistNoteDelete,
} from "@/lib/actions/notes";
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
import {
  createLearningAction as persistLearning,
  updateLearningAction as persistLearningUpdate,
  updateLearningProgressAction as persistLearningProgress,
  deleteLearningAction as persistLearningDelete,
} from "@/lib/actions/learning";
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

export async function createLearningAction(formData: FormData) {
  return persistLearning(formData);
}

export async function updateLearningAction(formData: FormData) {
  return persistLearningUpdate(formData);
}

export async function updateLearningProgressAction(formData: FormData) {
  return persistLearningProgress(formData);
}

export async function deleteLearningAction(id: string) {
  return persistLearningDelete(id);
}

export async function createNoteAction(formData: FormData) {
  return persistNote(formData);
}

export async function createBlankNoteAction() {
  return persistBlankNote();
}

export async function updateNoteAction(formData: FormData) {
  return persistNoteUpdate(formData);
}

export async function deleteNoteAction(noteId: string) {
  return persistNoteDelete(noteId);
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


export async function createEventAction(formData: FormData) {
  return persistEvent(formData);
}

export async function updateEventAction(formData: FormData) {
  return persistEventUpdate(formData);
}

export async function deleteEventAction(eventId: string) {
  return persistEventDelete(eventId);
}
