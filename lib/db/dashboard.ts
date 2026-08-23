import { prisma } from "@/lib/db/prisma";
import { addCalendarDays, utcMidnightFromCalendarDate, zonedDayRange } from "@/lib/utils/date";
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
  title: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
};

export type DashboardHabit = {
  id: string;
  name: string;
  completedToday: boolean;
  streak: number;
};

export type DashboardFocus = {
  goalId: string;
  goalTitle: string;
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
      where: { userId, status: "ACTIVE" },
      include: {
        tasks: {
          where: { status: { in: ["TODO", "IN_PROGRESS"] } },
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
          take: 3,
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
    }),
    prisma.habit.findMany({
      where: { userId, archived: false },
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
    const completedToday = habit.logs.some(
      (log) => log.completed && log.date.toISOString().slice(0, 10) === ymd
    );
    return {
      id: habit.id,
      name: habit.name,
      completedToday,
      streak: streakFromKeys(
        habit.logs.filter((log) => log.completed).map((log) => log.date.toISOString().slice(0, 10)),
        ymd
      ),
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

  const focus = selectFocus(activeGoals, start, end);

  return {
    hasAnyData: counts.some((count) => count > 0),
    completedToday,
    remainingToday,
    overdueCount,
    currentStreak,
    highPriorityToday,
    todayTasks,
    focus,
    activeGoals: activeGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      progress: goal.progress,
      targetDate: goal.targetDate,
    })),
    upcomingEvents: upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
    })),
    habits: mappedHabits,
  };
}

function selectFocus(
  goals: {
    id: string;
    title: string;
    progress: number;
    targetDate: Date | null;
    tasks: { id: string; title: string; dueAt: Date | null }[];
  }[],
  start: Date,
  end: Date
): DashboardFocus | null {
  if (goals.length === 0) return null;

  const ranked = [...goals].sort((a, b) => {
    const aLinked = a.tasks.length > 0 ? 0 : 1;
    const bLinked = b.tasks.length > 0 ? 0 : 1;
    if (aLinked !== bLinked) return aLinked - bLinked;
    const aTime = a.targetDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bTime = b.targetDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return b.progress - a.progress;
  });

  const goal = ranked[0];
  const nextTask =
    [...goal.tasks].sort((a, b) => taskFocusRank(a.dueAt, start, end) - taskFocusRank(b.dueAt, start, end))[0] ??
    null;

  return {
    goalId: goal.id,
    goalTitle: goal.title,
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

function streakFromKeys(keys: string[], today: string) {
  const days = new Set(keys);
  if (days.size === 0) return 0;

  let cursor = today;
  if (!days.has(cursor)) {
    cursor = addCalendarDays(cursor, -1);
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
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
