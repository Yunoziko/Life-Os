import { prisma } from "@/lib/db/prisma";
import { calendarDate } from "@/lib/utils/date";
import { habitHistory, habitWeekday } from "@/lib/habits/stats";
import {
  rangeBounds,
  timeBand,
  visibleCalendarRange,
  type CalendarView,
} from "@/lib/calendar/range";

export type CalendarItemKind = "event" | "task" | "habit";

export type CalendarItem = {
  id: string;
  kind: CalendarItemKind;
  title: string;
  date: string;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  href: string;
  location?: string | null;
  color?: string | null;
  projectName?: string | null;
  goalTitle?: string | null;
  band?: "morning" | "afternoon" | "evening" | "all-day";
  completed?: boolean;
};

const eventSelect = {
  id: true,
  title: true,
  description: true,
  startAt: true,
  endAt: true,
  allDay: true,
  location: true,
  color: true,
  reminderMinutes: true,
  recurrence: true,
  projectId: true,
  goalId: true,
  project: { select: { id: true, name: true } },
  goal: { select: { id: true, title: true } },
} as const;

export async function getCalendarWorkspace(
  userId: string,
  view: CalendarView,
  ymd: string,
  timeZone = "UTC",
  weekStartsOn = 1
) {
  const range = visibleCalendarRange(view, ymd, timeZone, weekStartsOn);
  const { start, end } = rangeBounds(range.startYmd, range.endYmd, timeZone);

  const [events, tasks, habits] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startAt: { gte: start, lt: end },
      },
      select: eventSelect,
      orderBy: [{ allDay: "desc" }, { startAt: "asc" }],
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "CANCELLED" },
        dueAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        status: true,
        project: { select: { name: true } },
        goal: { select: { title: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    view === "day"
      ? prisma.habit.findMany({
          where: { userId, archived: false, paused: false },
          select: {
            id: true,
            name: true,
            frequency: true,
            startDate: true,
            createdAt: true,
            logs: {
              where: { date: { gte: start, lt: end }, completed: true },
              select: { date: true },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 12,
        })
      : Promise.resolve([]),
  ]);

  const items: CalendarItem[] = [
    ...events.map((event) => {
      const date = calendarDate(timeZone, event.startAt);
      const hour = Number(
        new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(event.startAt)
      );
      return {
        id: event.id,
        kind: "event" as const,
        title: event.title,
        date,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt?.toISOString() ?? null,
        allDay: event.allDay,
        href: `/calendar?view=${view}&date=${date}&event=${event.id}`,
        location: event.location,
        color: event.color,
        projectName: event.project?.name ?? null,
        goalTitle: event.goal?.title ?? null,
        band: event.allDay ? ("all-day" as const) : timeBand(hour),
      };
    }),
    ...tasks.map((task) => {
      const date = calendarDate(timeZone, task.dueAt ?? start);
      const hour = task.dueAt
        ? Number(
            new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(task.dueAt)
          )
        : 9;
      const hasTime = Boolean(task.dueAt && (task.dueAt.getUTCHours() || task.dueAt.getUTCMinutes()));
      return {
        id: task.id,
        kind: "task" as const,
        title: task.title,
        date,
        startAt: task.dueAt?.toISOString() ?? null,
        endAt: null,
        allDay: !hasTime,
        href: `/tasks/${task.id}`,
        projectName: task.project?.name ?? null,
        goalTitle: task.goal?.title ?? null,
        band: !hasTime ? ("all-day" as const) : timeBand(hour),
        completed: task.status === "DONE",
      };
    }),
    ...habits.flatMap((habit) => {
      const weekday = habitWeekday(habit.startDate, habit.createdAt, timeZone);
      const history = habitHistory(
        habit.logs.map((log) => log.date.toISOString().slice(0, 10)),
        ymd,
        habit.frequency,
        weekday,
        1,
        calendarDate(timeZone, habit.startDate ?? habit.createdAt)
      );
      const today = history[0];
      if (!today || today.state === "none") return [];
      return [
        {
          id: habit.id,
          kind: "habit" as const,
          title: habit.name,
          date: ymd,
          startAt: null,
          endAt: null,
          allDay: true,
          href: `/habits/${habit.id}`,
          band: "all-day" as const,
          completed: today.state === "completed",
        },
      ];
    }),
  ];

  return {
    view,
    ymd,
    range,
    events: events.map((event) => ({
      ...event,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt?.toISOString() ?? null,
    })),
    items,
  };
}

export type CalendarWorkspace = Awaited<ReturnType<typeof getCalendarWorkspace>>;
