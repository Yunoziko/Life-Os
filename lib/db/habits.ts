import { prisma } from "@/lib/db/prisma";
import { addCalendarDays, calendarDate, utcMidnightFromCalendarDate } from "@/lib/utils/date";
import { calculateHabitStats, habitHistory, habitWeekday } from "@/lib/habits/stats";

export async function getHabitsWorkspace(userId: string, timeZone = "UTC") {
  const today = calendarDate(timeZone);
  const lookback = utcMidnightFromCalendarDate(addCalendarDays(today, -90));

  const [habits, logs] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, archived: false },
      include: { goal: { select: { id: true, title: true } } },
      orderBy: [{ paused: "asc" }, { createdAt: "asc" }],
    }),
    prisma.habitLog.findMany({
      where: { userId, date: { gte: lookback }, completed: true },
      select: { habitId: true, date: true },
    }),
  ]);

  const logsByHabit = new Map<string, string[]>();
  for (const log of logs) {
    const key = log.date.toISOString().slice(0, 10);
    const current = logsByHabit.get(log.habitId) ?? [];
    current.push(key);
    logsByHabit.set(log.habitId, current);
  }

  return habits.map((habit) => {
    const completedDates = logsByHabit.get(habit.id) ?? [];
    const weekday = habitWeekday(habit.startDate, habit.createdAt, timeZone);
    const startYmd = calendarDate(timeZone, habit.startDate ?? habit.createdAt);
    const stats = calculateHabitStats(completedDates, today, habit.frequency, weekday, 30, startYmd);
    return {
      ...habit,
      ...stats,
      completedToday: completedDates.includes(today),
      history: habitHistory(completedDates, today, habit.frequency, weekday, 30, startYmd),
    };
  });
}

export async function getHabitWorkspace(userId: string, id: string, timeZone = "UTC") {
  const today = calendarDate(timeZone);
  const lookback = utcMidnightFromCalendarDate(addCalendarDays(today, -365));

  const habit = await prisma.habit.findFirst({
    where: { id, userId },
    include: {
      goal: { select: { id: true, title: true } },
      logs: {
        where: { date: { gte: lookback } },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!habit) return null;

  const completedDates = habit.logs
    .filter((log) => log.completed)
    .map((log) => log.date.toISOString().slice(0, 10));
  const weekday = habitWeekday(habit.startDate, habit.createdAt, timeZone);
  const startYmd = calendarDate(timeZone, habit.startDate ?? habit.createdAt);
  const stats = calculateHabitStats(completedDates, today, habit.frequency, weekday, 30, startYmd);

  return {
    ...habit,
    ...stats,
    completedToday: completedDates.includes(today),
    history: habitHistory(completedDates, today, habit.frequency, weekday, 30, startYmd),
    yearHistory: habitHistory(completedDates, today, habit.frequency, weekday, 90, startYmd),
  };
}

export type HabitOverview = Awaited<ReturnType<typeof getHabitsWorkspace>>[number];
export type HabitWorkspace = NonNullable<Awaited<ReturnType<typeof getHabitWorkspace>>>;
