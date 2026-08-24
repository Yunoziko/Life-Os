import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AIError } from "@/lib/ai/errors";
import { aiLog, publicUserRef } from "@/lib/ai/logger";
import { notePreview } from "@/lib/notes/preview";
import { combineDueAt } from "@/lib/utils/due";
import {
  addCalendarDays,
  calendarDate,
  formatShortDate,
  formatTime,
  utcMidnightFromCalendarDate,
  zonedDateTime,
  zonedDayRange,
} from "@/lib/utils/date";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";

const optionalId = z.string().uuid().optional();
const optionalTitle = z.string().trim().min(1).max(160).optional();
const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .optional()
  .or(z.literal(""));
const timeString = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Use HH:mm.")
  .optional()
  .or(z.literal(""));

export type ToolContext = {
  userId: string;
  timeZone: string;
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  summary?: string;
};

function ok(data: unknown, summary?: string): ToolResult {
  return { ok: true, data, summary };
}

function fail(error: string): ToolResult {
  return { ok: false, error };
}

function stamp(value: Date | null | undefined, timeZone: string, allDay = false) {
  if (!value) return null;
  const date = formatShortDate(value, timeZone);
  if (allDay) return date;
  return `${date} ${formatTime(value, timeZone)}`;
}

async function findTask(userId: string, id?: string, title?: string) {
  if (id) {
    return prisma.task.findFirst({ where: { id, userId } });
  }
  if (title) {
    return prisma.task.findFirst({
      where: { userId, title: { equals: title, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
    });
  }
  return null;
}

async function findGoal(userId: string, id?: string, title?: string) {
  if (id) {
    return prisma.goal.findFirst({ where: { id, userId } });
  }
  if (title) {
    return prisma.goal.findFirst({
      where: { userId, title: { equals: title, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
    });
  }
  return null;
}

async function findProject(userId: string, id?: string, name?: string) {
  if (id) {
    return prisma.project.findFirst({ where: { id, userId } });
  }
  if (name) {
    return prisma.project.findFirst({
      where: { userId, name: { equals: name, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
    });
  }
  return null;
}

async function findNote(userId: string, id?: string, title?: string) {
  if (id) {
    return prisma.note.findFirst({ where: { id, userId } });
  }
  if (title) {
    return prisma.note.findFirst({
      where: { userId, title: { equals: title, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
    });
  }
  return null;
}

async function findHabit(userId: string, id?: string, name?: string) {
  if (id) {
    return prisma.habit.findFirst({
      where: { id, userId, archived: false },
    });
  }
  if (name) {
    return prisma.habit.findFirst({
      where: { userId, archived: false, name: { equals: name, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
    });
  }
  return null;
}

export async function getTodayTasks({ userId, timeZone }: ToolContext): Promise<ToolResult> {
  const { start, end } = zonedDayRange(timeZone);
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: "CANCELLED" },
      OR: [
        { dueAt: { gte: start, lt: end } },
        { dueAt: { lt: start }, status: { not: "DONE" } },
        { dueAt: null, status: { in: ["TODO", "IN_PROGRESS"] } },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueAt: true,
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }],
    take: 30,
  });

  return ok(
    tasks.map((task) => ({
      ...task,
      due: stamp(task.dueAt, timeZone),
      overdue: Boolean(task.dueAt && task.dueAt < start && task.status !== "DONE"),
    })),
    `${tasks.length} task${tasks.length === 1 ? "" : "s"} for today`
  );
}

export async function getUpcomingEvents({ userId, timeZone }: ToolContext): Promise<ToolResult> {
  const { start } = zonedDayRange(timeZone);
  const until = zonedDayRange(timeZone, utcMidnightFromCalendarDate(addCalendarDays(calendarDate(timeZone), 7))).start;
  const events = await prisma.calendarEvent.findMany({
    where: { userId, startAt: { gte: start, lt: until } },
    select: { id: true, title: true, startAt: true, endAt: true, allDay: true, location: true },
    orderBy: { startAt: "asc" },
    take: 20,
  });
  return ok(
    events.map((event) => ({
      id: event.id,
      title: event.title,
      when: stamp(event.startAt, timeZone, event.allDay),
      location: event.location,
    })),
    `${events.length} upcoming event${events.length === 1 ? "" : "s"}`
  );
}

export async function getActiveGoals({ userId, timeZone }: ToolContext): Promise<ToolResult> {
  const goals = await prisma.goal.findMany({
    where: { userId, status: { in: ["ACTIVE", "NOT_STARTED"] } },
    select: { id: true, title: true, status: true, priority: true, progress: true, targetDate: true },
    orderBy: [{ priority: "desc" }, { targetDate: "asc" }],
    take: 25,
  });
  return ok(
    goals.map((goal) => ({
      ...goal,
      targetDate: goal.targetDate ? calendarDate(timeZone, goal.targetDate) : null,
    })),
    `${goals.length} active goal${goals.length === 1 ? "" : "s"}`
  );
}

export async function getActiveProjects({ userId, timeZone }: ToolContext): Promise<ToolResult> {
  const projects = await prisma.project.findMany({
    where: { userId, status: { in: ["ACTIVE", "PLANNED"] } },
    select: { id: true, name: true, status: true, dueDate: true },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
  return ok(
    projects.map((project) => ({
      ...project,
      dueDate: project.dueDate ? calendarDate(timeZone, project.dueDate) : null,
    })),
    `${projects.length} active project${projects.length === 1 ? "" : "s"}`
  );
}

export async function getTodayHabits({ userId, timeZone }: ToolContext): Promise<ToolResult> {
  const day = utcMidnightFromCalendarDate(calendarDate(timeZone));
  const habits = await prisma.habit.findMany({
    where: { userId, archived: false, paused: false },
    select: {
      id: true,
      name: true,
      frequency: true,
      logs: { where: { date: day, completed: true }, select: { id: true }, take: 1 },
    },
    take: 25,
  });
  return ok(
    habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      completedToday: habit.logs.length > 0,
    })),
    `${habits.length} habit${habits.length === 1 ? "" : "s"} today`
  );
}

export async function searchNotes(
  { userId }: ToolContext,
  args: unknown
): Promise<ToolResult> {
  const parsed = z.object({ query: z.string().trim().min(1).max(120) }).safeParse(args);
  if (!parsed.success) return fail("Search needs a query.");

  const q = parsed.data.query;
  const notes = await prisma.note.findMany({
    where: {
      userId,
      archived: false,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { preview: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    },
    select: { id: true, title: true, preview: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return ok(
    notes.map((note) => ({
      id: note.id,
      title: note.title,
      preview: note.preview.slice(0, 140),
    })),
    `${notes.length} note${notes.length === 1 ? "" : "s"} matched`
  );
}

export async function getWeeklySummary({ userId, timeZone }: ToolContext): Promise<ToolResult> {
  const today = zonedDayRange(timeZone);
  const weekStart = zonedDayRange(timeZone, new Date(Date.now() - 6 * 86_400_000)).start;
  const habitDay = utcMidnightFromCalendarDate(today.ymd);

  const [completed, stillOpen, overdue, events, habitLogs, habits] = await Promise.all([
    prisma.task.count({
      where: { userId, status: "DONE", completedAt: { gte: weekStart, lt: today.end } },
    }),
    prisma.task.count({
      where: { userId, status: { in: ["TODO", "IN_PROGRESS"] } },
    }),
    prisma.task.count({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueAt: { lt: today.start },
      },
    }),
    prisma.calendarEvent.count({
      where: { userId, startAt: { gte: weekStart, lt: today.end } },
    }),
    prisma.habitLog.count({
      where: { userId, completed: true, date: { gte: utcMidnightFromCalendarDate(calendarDate(timeZone, weekStart)), lte: habitDay } },
    }),
    prisma.habit.count({ where: { userId, archived: false, paused: false } }),
  ]);

  const goals = await prisma.goal.findMany({
    where: { userId, status: { in: ["ACTIVE", "NOT_STARTED", "COMPLETED"] } },
    select: { title: true, progress: true, status: true, targetDate: true },
    take: 12,
  });

  return ok(
    {
      completedTasks: completed,
      openTasks: stillOpen,
      overdueTasks: overdue,
      eventsThisWeek: events,
      habitCompletions: habitLogs,
      activeHabits: habits,
      goals: goals.map((goal) => ({
        title: goal.title,
        progress: goal.progress,
        status: goal.status,
        targetDate: goal.targetDate ? calendarDate(timeZone, goal.targetDate) : null,
      })),
    },
    `Week: ${completed} completed, ${overdue} overdue`
  );
}

async function getTodaySchedule(ctx: ToolContext): Promise<ToolResult> {
  const { start, end } = zonedDayRange(ctx.timeZone);
  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId: ctx.userId, startAt: { gte: start, lt: end } },
      select: { id: true, title: true, startAt: true, endAt: true, allDay: true },
      orderBy: { startAt: "asc" },
      take: 16,
    }),
    prisma.task.findMany({
      where: {
        userId: ctx.userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueAt: { gte: start, lt: end },
      },
      select: { id: true, title: true, dueAt: true, priority: true },
      orderBy: { dueAt: "asc" },
      take: 16,
    }),
  ]);

  return ok({
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      when: stamp(event.startAt, ctx.timeZone, event.allDay),
    })),
    timedTasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      due: stamp(task.dueAt, ctx.timeZone),
      priority: task.priority,
    })),
  });
}

async function queryTasks(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      query: z.string().trim().max(120).optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
    })
    .safeParse(args ?? {});
  if (!parsed.success) return fail("Invalid task filters.");

  const tasks = await prisma.task.findMany({
    where: {
      userId: ctx.userId,
      ...(parsed.data.status ? { status: parsed.data.status } : { status: { not: "CANCELLED" } }),
      ...(parsed.data.query
        ? {
            OR: [
              { title: { contains: parsed.data.query, mode: "insensitive" as const } },
              { description: { contains: parsed.data.query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: { id: true, title: true, status: true, priority: true, dueAt: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return ok(
    tasks.map((task) => ({ ...task, due: stamp(task.dueAt, ctx.timeZone) })),
    `${tasks.length} task${tasks.length === 1 ? "" : "s"}`
  );
}

async function queryGoals(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      query: z.string().trim().max(120).optional(),
      status: z.enum(["NOT_STARTED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
    })
    .safeParse(args ?? {});
  if (!parsed.success) return fail("Invalid goal filters.");

  const goals = await prisma.goal.findMany({
    where: {
      userId: ctx.userId,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.query
        ? {
            OR: [
              { title: { contains: parsed.data.query, mode: "insensitive" as const } },
              { description: { contains: parsed.data.query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: { id: true, title: true, status: true, progress: true, targetDate: true },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });
  return ok(goals);
}

async function queryProjects(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      query: z.string().trim().max(120).optional(),
      status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
    })
    .safeParse(args ?? {});
  if (!parsed.success) return fail("Invalid project filters.");

  const projects = await prisma.project.findMany({
    where: {
      userId: ctx.userId,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.query
        ? {
            OR: [
              { name: { contains: parsed.data.query, mode: "insensitive" as const } },
              { description: { contains: parsed.data.query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, status: true, dueDate: true },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });
  return ok(projects);
}

async function queryHabits(ctx: ToolContext): Promise<ToolResult> {
  return getTodayHabits(ctx);
}

export async function createTask(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(160),
      description: z.string().trim().max(2000).optional(),
      dueDate: dateString,
      dueTime: timeString,
      priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      projectId: optionalId,
      goalId: optionalId,
    })
    .safeParse(args);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid task.");

  if (parsed.data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId: ctx.userId },
      select: { id: true },
    });
    if (!project) return fail("That project isn’t in your workspace.");
  }
  if (parsed.data.goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: parsed.data.goalId, userId: ctx.userId },
      select: { id: true },
    });
    if (!goal) return fail("That goal isn’t in your workspace.");
  }

  const task = await prisma.task.create({
    data: {
      userId: ctx.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority ?? "NONE",
      dueAt: combineDueAt(parsed.data.dueDate, parsed.data.dueTime, ctx.timeZone),
      projectId: parsed.data.projectId ?? null,
      goalId: parsed.data.goalId ?? null,
    },
    select: { id: true, title: true },
  });
  revalidateWorkspace();
  return ok(task, `Created task: ${task.title}`);
}

export async function updateTask(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      id: optionalId,
      title: optionalTitle,
      description: z.string().trim().max(2000).optional(),
      dueDate: dateString,
      dueTime: timeString,
      priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
    })
    .safeParse(args);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid task update.");

  const existing = await findTask(ctx.userId, parsed.data.id, parsed.data.title);
  if (!existing) return fail("Task not found.");

  const nextStatus = parsed.data.status ?? existing.status;
  const dueAt =
    parsed.data.dueDate
      ? combineDueAt(parsed.data.dueDate, parsed.data.dueTime, ctx.timeZone)
      : undefined;

  await prisma.task.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.title && parsed.data.id ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.status ? { status: nextStatus } : {}),
      ...(dueAt !== undefined ? { dueAt } : {}),
      ...(nextStatus === "DONE" && existing.status !== "DONE" ? { completedAt: new Date() } : {}),
      ...(nextStatus !== "DONE" && existing.status === "DONE" ? { completedAt: null } : {}),
    },
  });
  revalidateWorkspace([`/tasks/${existing.id}`]);
  return ok({ id: existing.id }, `Updated task: ${existing.title}`);
}

export async function completeTask(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ id: optionalId, title: optionalTitle }).safeParse(args ?? {});
  if (!parsed.success) return fail("Choose a task to complete.");

  const existing = await findTask(ctx.userId, parsed.data.id, parsed.data.title);
  if (!existing) return fail("Task not found.");
  if (existing.status === "DONE") return ok({ id: existing.id }, `Already complete: ${existing.title}`);

  await prisma.task.update({
    where: { id: existing.id },
    data: { status: "DONE", completedAt: new Date() },
  });
  revalidateWorkspace([`/tasks/${existing.id}`]);
  return ok({ id: existing.id }, `Completed: ${existing.title}`);
}

export async function createGoal(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(160),
      description: z.string().trim().max(2000).optional(),
      category: z.string().trim().max(80).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
      targetDate: dateString,
    })
    .safeParse(args);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid goal.");

  const goal = await prisma.goal.create({
    data: {
      userId: ctx.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category ?? null,
      priority: parsed.data.priority ?? "MEDIUM",
      targetDate: parsed.data.targetDate ? new Date(`${parsed.data.targetDate}T12:00:00.000Z`) : null,
    },
    select: { id: true, title: true },
  });
  revalidateWorkspace([`/goals/${goal.id}`]);
  return ok(goal, `Created goal: ${goal.title}`);
}

export async function updateGoal(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      id: optionalId,
      title: optionalTitle,
      description: z.string().trim().max(2000).optional(),
      progress: z.number().int().min(0).max(100).optional(),
      status: z.enum(["NOT_STARTED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
      targetDate: dateString,
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    })
    .safeParse(args);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid goal update.");

  const existing = await findGoal(ctx.userId, parsed.data.id, parsed.data.title);
  if (!existing) return fail("Goal not found.");

  await prisma.goal.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.title && parsed.data.id ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.progress !== undefined ? { progress: parsed.data.progress } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.targetDate
        ? { targetDate: new Date(`${parsed.data.targetDate}T12:00:00.000Z`) }
        : {}),
    },
  });
  revalidateWorkspace([`/goals/${existing.id}`]);
  return ok({ id: existing.id }, `Updated goal: ${existing.title}`);
}

export async function createProject(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(160),
      description: z.string().trim().max(2000).optional(),
      dueDate: dateString,
    })
    .safeParse(args);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid project.");

  const project = await prisma.project.create({
    data: {
      userId: ctx.userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      dueDate: parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T12:00:00.000Z`) : null,
    },
    select: { id: true, name: true },
  });
  revalidateWorkspace([`/projects/${project.id}`]);
  return ok(project, `Created project: ${project.name}`);
}

export async function createCalendarEvent(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(160),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: timeString,
      endTime: timeString,
      allDay: z.boolean().optional(),
      description: z.string().trim().max(2000).optional(),
      location: z.string().trim().max(160).optional(),
    })
    .safeParse(args);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid event.");

  const allDay = parsed.data.allDay ?? !parsed.data.startTime;
  const startAt = zonedDateTime(
    parsed.data.date,
    allDay ? "00:00" : parsed.data.startTime || "09:00",
    ctx.timeZone
  );
  const endAt = allDay
    ? zonedDateTime(parsed.data.date, "23:59", ctx.timeZone)
    : parsed.data.endTime
      ? zonedDateTime(parsed.data.date, parsed.data.endTime, ctx.timeZone)
      : null;

  if (Number.isNaN(startAt.getTime())) return fail("Choose a valid start time.");
  if (endAt && endAt < startAt) return fail("End time needs to be after the start.");

  const event = await prisma.calendarEvent.create({
    data: {
      userId: ctx.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      startAt,
      endAt,
      allDay,
      location: parsed.data.location ?? null,
    },
    select: { id: true, title: true },
  });
  revalidateWorkspace();
  return ok(event, `Scheduled: ${event.title}`);
}

export async function createNote(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(160),
      content: z.string().max(20_000).optional(),
    })
    .safeParse(args);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid note.");

  const content = parsed.data.content ?? "";
  const note = await prisma.note.create({
    data: {
      userId: ctx.userId,
      title: parsed.data.title,
      content,
      preview: notePreview(content),
    },
    select: { id: true, title: true },
  });
  revalidateWorkspace([`/notes/${note.id}`]);
  return ok(note, `Created note: ${note.title}`);
}

export async function completeHabit(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ id: optionalId, name: optionalTitle }).safeParse(args ?? {});
  if (!parsed.success) return fail("Choose a habit to complete.");

  const habit = await findHabit(ctx.userId, parsed.data.id, parsed.data.name);
  if (!habit || habit.paused) return fail("Habit not found.");

  const date = utcMidnightFromCalendarDate(calendarDate(ctx.timeZone));
  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: habit.id, date } },
  });

  if (existing?.completed) {
    return ok({ id: habit.id, completed: true }, `Already complete: ${habit.name}`);
  }

  if (existing) {
    await prisma.habitLog.update({ where: { id: existing.id }, data: { completed: true } });
  } else {
    await prisma.habitLog.create({
      data: { userId: ctx.userId, habitId: habit.id, date, completed: true },
    });
  }
  revalidateWorkspace([`/habits/${habit.id}`]);
  return ok({ id: habit.id, completed: true }, `Completed habit: ${habit.name}`);
}

export async function deleteTask(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ id: optionalId, title: optionalTitle }).safeParse(args ?? {});
  if (!parsed.success) return fail("Choose a task to delete.");
  const existing = await findTask(ctx.userId, parsed.data.id, parsed.data.title);
  if (!existing) return fail("Task not found.");
  await prisma.task.delete({ where: { id: existing.id } });
  revalidateWorkspace();
  return ok({ id: existing.id }, `Deleted task: ${existing.title}`);
}

export async function deleteGoal(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ id: optionalId, title: optionalTitle }).safeParse(args ?? {});
  if (!parsed.success) return fail("Choose a goal to delete.");
  const existing = await findGoal(ctx.userId, parsed.data.id, parsed.data.title);
  if (!existing) return fail("Goal not found.");
  await prisma.goal.delete({ where: { id: existing.id } });
  revalidateWorkspace();
  return ok({ id: existing.id }, `Deleted goal: ${existing.title}`);
}

export async function deleteProject(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ id: optionalId, name: optionalTitle }).safeParse(args ?? {});
  if (!parsed.success) return fail("Choose a project to delete.");
  const existing = await findProject(ctx.userId, parsed.data.id, parsed.data.name);
  if (!existing) return fail("Project not found.");
  await prisma.project.delete({ where: { id: existing.id } });
  revalidateWorkspace();
  return ok({ id: existing.id }, `Deleted project: ${existing.name}`);
}

export async function deleteNote(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ id: optionalId, title: optionalTitle }).safeParse(args ?? {});
  if (!parsed.success) return fail("Choose a note to delete.");
  const existing = await findNote(ctx.userId, parsed.data.id, parsed.data.title);
  if (!existing) return fail("Note not found.");
  await prisma.note.delete({ where: { id: existing.id } });
  revalidateWorkspace();
  return ok({ id: existing.id }, `Deleted note: ${existing.title}`);
}

const handlers: Record<string, (ctx: ToolContext, args: unknown) => Promise<ToolResult>> = {
  get_today_tasks: (ctx) => getTodayTasks(ctx),
  get_tasks: (ctx, args) => queryTasks(ctx, args),
  get_today_schedule: (ctx) => getTodaySchedule(ctx),
  get_upcoming_events: (ctx) => getUpcomingEvents(ctx),
  get_active_goals: (ctx) => getActiveGoals(ctx),
  get_goals: (ctx, args) => queryGoals(ctx, args),
  get_active_projects: (ctx) => getActiveProjects(ctx),
  get_projects: (ctx, args) => queryProjects(ctx, args),
  get_today_habits: (ctx) => getTodayHabits(ctx),
  get_habits: (ctx) => queryHabits(ctx),
  search_notes: (ctx, args) => searchNotes(ctx, args),
  get_weekly_summary: (ctx) => getWeeklySummary(ctx),
  create_task: (ctx, args) => createTask(ctx, args),
  update_task: (ctx, args) => updateTask(ctx, args),
  complete_task: (ctx, args) => completeTask(ctx, args),
  create_goal: (ctx, args) => createGoal(ctx, args),
  update_goal: (ctx, args) => updateGoal(ctx, args),
  create_project: (ctx, args) => createProject(ctx, args),
  create_calendar_event: (ctx, args) => createCalendarEvent(ctx, args),
  create_note: (ctx, args) => createNote(ctx, args),
  complete_habit: (ctx, args) => completeHabit(ctx, args),
  delete_task: (ctx, args) => deleteTask(ctx, args),
  delete_goal: (ctx, args) => deleteGoal(ctx, args),
  delete_project: (ctx, args) => deleteProject(ctx, args),
  delete_note: (ctx, args) => deleteNote(ctx, args),
};

export function isKnownTool(name: string) {
  return name in handlers;
}

export async function executeLifeOSTool(
  name: string,
  args: unknown,
  ctx: ToolContext
): Promise<ToolResult> {
  const handler = handlers[name];
  if (!handler) return fail("Unknown tool.");

  try {
    const result = await handler(ctx, args);
    if (result.ok) {
      aiLog.tool({ user: publicUserRef(ctx.userId), tool: name, ok: true });
    } else {
      aiLog.toolFailed({ user: publicUserRef(ctx.userId), tool: name, ok: false });
    }
    return result;
  } catch (error) {
    aiLog.toolFailed({ user: publicUserRef(ctx.userId), tool: name, ok: false });
    if (error instanceof AIError) return fail(error.toUserMessage());
    return fail("That action couldn’t be completed.");
  }
}
