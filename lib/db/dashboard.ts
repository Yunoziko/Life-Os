import { prisma } from "@/lib/db/prisma";
import { addDays, startOfUtcDay } from "@/lib/utils/date";

export async function getDashboardData(userId: string) {
  const now = new Date();
  const today = startOfUtcDay(now);
  const upcomingLimit = addDays(today, 14);

  const [
    tasksDue,
    completedToday,
    remainingToday,
    activeGoals,
    upcomingEvents,
    habits,
    completedHabitsToday,
    hasAnyData,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "CANCELLED" },
        OR: [
          { dueAt: { gte: today, lt: addDays(today, 1) } },
          { dueAt: null, status: { not: "DONE" } },
        ],
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.task.count({
      where: {
        userId,
        status: "DONE",
        completedAt: { gte: today },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        OR: [{ dueAt: { lt: addDays(today, 1) } }, { dueAt: null }],
      },
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startAt: { gte: today, lte: upcomingLimit },
      },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    prisma.habit.findMany({
      where: { userId, archived: false },
      include: {
        logs: {
          where: { date: { gte: addDays(today, -30) } },
          orderBy: { date: "desc" },
        },
      },
      take: 6,
    }),
    prisma.habitLog.count({
      where: {
        userId,
        completed: true,
        date: { gte: today, lt: addDays(today, 1) },
      },
    }),
    Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.project.count({ where: { userId } }),
      prisma.habit.count({ where: { userId } }),
      prisma.calendarEvent.count({ where: { userId } }),
    ]).then((counts) => counts.some((count) => count > 0)),
  ]);

  const currentStreak = computeHabitStreak(habits.flatMap((habit) => habit.logs));

  return {
    hasAnyData,
    completedToday,
    remainingToday,
    currentStreak,
    todayTasks: tasksDue,
    activeGoals,
    upcomingEvents,
    habits,
    completedHabitsToday,
  };
}

function computeHabitStreak(
  logs: { date: Date; completed: boolean }[]
) {
  const completedDays = new Set(
    logs
      .filter((log) => log.completed)
      .map((log) => startOfUtcDay(log.date).toISOString())
  );

  if (completedDays.size === 0) return 0;

  let streak = 0;
  let cursor = startOfUtcDay(new Date());

  if (!completedDays.has(cursor.toISOString())) {
    cursor = addDays(cursor, -1);
  }

  while (completedDays.has(cursor.toISOString())) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
