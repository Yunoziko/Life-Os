import { prisma } from "@/lib/db/prisma";
import { addCalendarDays, calendarDate, utcMidnightFromCalendarDate, zonedDayRange } from "@/lib/utils/date";
import { calculateHabitStats, habitWeekday, streakFromKeys } from "@/lib/habits/stats";
import { calculateTaskProgress, resolveGoalProgress } from "@/lib/utils/progress";
import type { TaskPriority, TaskStatus } from "@/generated/prisma/enums";

export type DashboardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  projectName: string | null;
  overdue: boolean;
};

export type DashboardGoal = {
  id: string;
  title: string;
  progress: number;
  targetDate: Date | null;
};

export type DashboardEvent = {
  id: string;
  kind: "event" | "task";
  title: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  href: string;
  source?: "LIFEOS" | "GOOGLE";
};

export type DashboardHabit = {
  id: string;
  name: string;
  completedToday: boolean;
  streak: number;
};

export type DashboardFocus = {
  goalId: string | null;
  goalTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  progress: number;
  taskId: string | null;
  taskTitle: string | null;
};

export type DashboardData = {
  hasAnyData: boolean;
  completedToday: number;
  remainingToday: number;
  overdueCount: number;
  currentStreak: number;
  highPriorityToday: number;
  todayTasks: DashboardTask[];
  focus: DashboardFocus | null;
  activeGoals: DashboardGoal[];
  upcomingEvents: DashboardEvent[];
  habits: DashboardHabit[];
};

export async function getDashboardData(
  userId: string,
  timeZone = "UTC"
): Promise<DashboardData> {
  const { ymd, start, end } = zonedDayRange(timeZone);
  const upcomingLimit = new Date(end.getTime() + 13 * 86_400_000);
  const habitLookback = utcMidnightFromCalendarDate(addCalendarDays(ymd, -60));

  const [
    rawTasks,
    completedToday,
    remainingToday,
    overdueCount,
    highPriorityToday,
    activeGoals,
    upcomingEvents,
    habits,
    counts,
    activeProject,
    upcomingTasks,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "CANCELLED" },
        OR: [
          { dueAt: { gte: start, lt: end } },
          { dueAt: { lt: start }, status: { not: "DONE" } },
          { dueAt: null, status: { not: "DONE" } },
          { completedAt: { gte: start, lt: end } },
        ],
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
    prisma.task.count({
      where: {
        userId,
        status: "DONE",
        completedAt: { gte: start, lt: end },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        OR: [{ dueAt: { lt: end } }, { dueAt: null }],
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueAt: { lt: start },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        priority: { in: ["HIGH", "URGENT"] },
        OR: [{ dueAt: { gte: start, lt: end } }, { dueAt: { lt: start } }, { dueAt: null }],
      },
    }),
    prisma.goal.findMany({
      where: { userId, status: { in: ["ACTIVE", "NOT_STARTED"] } },
      include: {
        milestones: { select: { completed: true } },
        tasks: {
          where: { status: { not: "CANCELLED" } },
          select: { id: true, title: true, dueAt: true, status: true },
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ targetDate: "asc" }, { updatedAt: "desc" }],
      take: 5,
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startAt: { gte: start, lte: upcomingLimit },
      },
      orderBy: { startAt: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        allDay: true,
        source: true,
      },
    }),
    prisma.habit.findMany({
      where: { userId, archived: false, paused: false },
      include: {
        logs: {
          where: { date: { gte: habitLookback } },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.project.count({ where: { userId } }),
      prisma.habit.count({ where: { userId } }),
      prisma.calendarEvent.count({ where: { userId } }),
    ]),
    prisma.project.findFirst({
      where: { userId, status: "ACTIVE" },
      include: {
        tasks: {
          where: { status: { not: "CANCELLED" } },
          select: { id: true, title: true, dueAt: true, status: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "CANCELLED" },
        dueAt: { gte: start, lte: upcomingLimit },
      },
      select: { id: true, title: true, dueAt: true },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
  ]);

  const todayTasks: DashboardTask[] = rawTasks
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt,
      projectName: task.project?.name ?? null,
      overdue: Boolean(task.dueAt && task.dueAt < start && task.status !== "DONE"),
    }))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if ((a.status === "DONE") !== (b.status === "DONE")) return a.status === "DONE" ? 1 : -1;
      return 0;
    });

  const mappedHabits: DashboardHabit[] = habits.map((habit) => {
    const completedDates = habit.logs
      .filter((log) => log.completed)
      .map((log) => log.date.toISOString().slice(0, 10));
    const weekday = habitWeekday(habit.startDate, habit.createdAt, timeZone);
    const startYmd = calendarDate(timeZone, habit.startDate ?? habit.createdAt);
    const stats = calculateHabitStats(completedDates, ymd, habit.frequency, weekday, 30, startYmd);
    return {
      id: habit.id,
      name: habit.name,
      completedToday: completedDates.includes(ymd),
      streak: stats.currentStreak,
    };
  });

  const currentStreak = streakFromKeys(
    habits.flatMap((habit) =>
      habit.logs
        .filter((log) => log.completed)
        .map((log) => log.date.toISOString().slice(0, 10))
    ),
    ymd
  );

  const goalsWithProgress = activeGoals.map((goal) => ({
    ...goal,
    progress: resolveGoalProgress({
      manual: goal.progress,
      milestones: goal.milestones,
      tasks: goal.tasks,
    }).percent,
    openTasks: goal.tasks.filter((task) => task.status === "TODO" || task.status === "IN_PROGRESS"),
  }));

  const focus = selectFocus(goalsWithProgress, activeProject, start, end);

  return {
    hasAnyData: counts.some((count) => count > 0),
    completedToday,
    remainingToday,
    overdueCount,
    currentStreak,
    highPriorityToday,
    todayTasks,
    focus,
    activeGoals: goalsWithProgress.map((goal) => ({
      id: goal.id,
      title: goal.title,
      progress: goal.progress,
      targetDate: goal.targetDate,
    })),
    upcomingEvents: [
      ...upcomingEvents.map((event) => ({
        id: event.id,
        kind: "event" as const,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        href: `/calendar?date=${calendarDate(timeZone, event.startAt)}&event=${event.id}&view=day`,
        source: event.source === "GOOGLE" ? ("GOOGLE" as const) : ("LIFEOS" as const),
      })),
      ...upcomingTasks
        .filter((task): task is typeof task & { dueAt: Date } => Boolean(task.dueAt))
        .map((task) => ({
          id: task.id,
          kind: "task" as const,
          title: task.title,
          startAt: task.dueAt,
          endAt: null,
          allDay: false,
          href: `/tasks/${task.id}`,
        })),
    ]
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .slice(0, 8),
    habits: mappedHabits,
  };
}

function selectFocus(
  goals: {
    id: string;
    title: string;
    progress: number;
    targetDate: Date | null;
    openTasks: { id: string; title: string; dueAt: Date | null }[];
  }[],
  project: {
    id: string;
    name: string;
    tasks: { id: string; title: string; dueAt: Date | null; status: string }[];
  } | null,
  start: Date,
  end: Date
): DashboardFocus | null {
  const projectProgress = project ? calculateTaskProgress(project.tasks) : null;
  const projectTask =
    project?.tasks
      .filter((task) => task.status === "TODO" || task.status === "IN_PROGRESS")
      .sort((a, b) => taskFocusRank(a.dueAt, start, end) - taskFocusRank(b.dueAt, start, end))[0] ?? null;

  if (goals.length === 0) {
    if (!project) return null;
    return {
      goalId: null,
      goalTitle: null,
      projectId: project.id,
      projectName: project.name,
      progress: projectProgress?.percent ?? 0,
      taskId: projectTask?.id ?? null,
      taskTitle: projectTask?.title ?? null,
    };
  }

  const ranked = [...goals].sort((a, b) => {
    const aLinked = a.openTasks.length > 0 ? 0 : 1;
    const bLinked = b.openTasks.length > 0 ? 0 : 1;
    if (aLinked !== bLinked) return aLinked - bLinked;
    const aTime = a.targetDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bTime = b.targetDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return b.progress - a.progress;
  });

  const goal = ranked[0];
  const nextTask =
    [...goal.openTasks].sort((a, b) => taskFocusRank(a.dueAt, start, end) - taskFocusRank(b.dueAt, start, end))[0] ??
    projectTask ??
    null;

  return {
    goalId: goal.id,
    goalTitle: goal.title,
    projectId: project?.id ?? null,
    projectName: project?.name ?? null,
    progress: goal.progress,
    taskId: nextTask?.id ?? null,
    taskTitle: nextTask?.title ?? null,
  };
}

function taskFocusRank(dueAt: Date | null, start: Date, end: Date) {
  if (dueAt && dueAt >= start && dueAt < end) return 0;
  if (dueAt && dueAt < start) return 1;
  return 2;
}

export function dashboardStatusLine(data: DashboardData) {
  if (!data.hasAnyData) return "Your day is wide open.";
  if (data.overdueCount > 0) return "Start with what’s overdue.";
  if (data.remainingToday > 0) return "Let’s make today count.";
  if (data.habits.some((habit) => !habit.completedToday)) {
    return "A few habits are still open.";
  }
  if (data.completedToday > 0 || data.habits.some((habit) => habit.completedToday)) {
    return "Today is in good shape.";
  }
  return "Here’s your overview for today.";
}
