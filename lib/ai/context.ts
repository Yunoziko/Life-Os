import { prisma } from "@/lib/db/prisma";
import {
  addCalendarDays,
  calendarDate,
  formatClock,
  formatLongDate,
  formatTime,
  utcMidnightFromCalendarDate,
  zonedDayRange,
} from "@/lib/utils/date";
import type { ContextSource } from "@/lib/ai/types";
import { AIError } from "@/lib/ai/errors";
import { getIntegrationConnectionMap, integrationStatusPrompt } from "@/lib/integrations/status";

export type LifeOSContext = {
  promptBlock: string;
  sources: ContextSource[];
  considered: Record<ContextSource, number>;
};

function isoDate(value: Date | null, timeZone: string) {
  if (!value) return null;
  return calendarDate(timeZone, value);
}

function stamp(value: Date | null, timeZone: string, allDay = false) {
  if (!value) return null;
  const date = calendarDate(timeZone, value);
  if (allDay) return date;
  return `${date} ${formatTime(value, timeZone)}`;
}

function clip(value: string | null | undefined, limit: number) {
  if (!value) return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}…` : trimmed;
}

export async function buildLifeOSContext(
  userId: string,
  timeZone = "UTC"
): Promise<LifeOSContext> {
  try {
    const today = zonedDayRange(timeZone);
    const weekAgo = zonedDayRange(timeZone, new Date(Date.now() - 6 * 86_400_000)).start;
    const weekAheadYmd = addCalendarDays(today.ymd, 7);
    const weekAhead = zonedDayRange(timeZone, utcMidnightFromCalendarDate(weekAheadYmd)).start;
    const habitDay = utcMidnightFromCalendarDate(today.ymd);

    const [
      todayTasks,
      upcomingEvents,
      activeGoals,
      activeProjects,
      habits,
      recentNotes,
      completedWeek,
      activeLearning,
      integrations,
    ] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          status: { not: "CANCELLED" },
          OR: [
            { dueAt: { gte: today.start, lt: today.end } },
            { dueAt: { lt: today.start }, status: { not: "DONE" } },
            { dueAt: null, status: { in: ["TODO", "IN_PROGRESS"] } },
            { completedAt: { gte: today.start, lt: today.end } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueAt: true,
          project: { select: { name: true } },
          goal: { select: { title: true } },
        },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }],
        take: 25,
      }),
      prisma.calendarEvent.findMany({
        where: {
          userId,
          startAt: { gte: today.start, lt: weekAhead },
        },
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          allDay: true,
          location: true,
          source: true,
        },
        orderBy: { startAt: "asc" },
        take: 15,
      }),
      prisma.goal.findMany({
        where: { userId, status: { in: ["ACTIVE", "NOT_STARTED"] } },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          progress: true,
          targetDate: true,
          category: true,
        },
        orderBy: [{ priority: "desc" }, { targetDate: "asc" }],
        take: 20,
      }),
      prisma.project.findMany({
        where: { userId, status: { in: ["ACTIVE", "PLANNED"] } },
        select: {
          id: true,
          name: true,
          status: true,
          dueDate: true,
          githubRepo: true,
          goal: { select: { title: true } },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 15,
      }),
      prisma.habit.findMany({
        where: { userId, archived: false, paused: false },
        select: {
          id: true,
          name: true,
          frequency: true,
          logs: {
            where: { date: habitDay, completed: true },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      prisma.note.findMany({
        where: { userId, archived: false },
        select: {
          id: true,
          title: true,
          preview: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.task.findMany({
        where: {
          userId,
          status: "DONE",
          completedAt: { gte: weekAgo, lt: today.end },
        },
        select: { id: true, title: true, completedAt: true, priority: true },
        orderBy: { completedAt: "desc" },
        take: 12,
      }),
      prisma.learningItem.findMany({
        where: { userId, status: { in: ["IN_PROGRESS", "NOT_STARTED", "PAUSED"] } },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          progress: true,
          provider: true,
          targetDate: true,
        },
        orderBy: [{ progress: "desc" }, { updatedAt: "desc" }],
        take: 12,
      }),
      getIntegrationConnectionMap(userId),
    ]);

    const snapshot = {
      now: {
        date: today.ymd,
        weekday: formatLongDate(new Date(), timeZone),
        timeZone,
      },
      today: {
        tasks: todayTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          due: stamp(task.dueAt, timeZone),
          overdue: Boolean(task.dueAt && task.dueAt < today.start && task.status !== "DONE"),
          project: task.project?.name,
          goal: task.goal?.title,
        })),
        habits: habits.map((habit) => ({
          id: habit.id,
          name: habit.name,
          frequency: habit.frequency,
          completedToday: habit.logs.length > 0,
        })),
      },
      upcomingEvents: upcomingEvents.map((event) => ({
        id: event.id,
        title: event.title,
        when: stamp(event.startAt, timeZone, event.allDay),
        until: event.endAt ? stamp(event.endAt, timeZone, event.allDay) : null,
        allDay: event.allDay,
        location: event.location,
        source: event.source === "GOOGLE" ? "google" : "lifeos",
      })),
      activeGoals: activeGoals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        status: goal.status,
        priority: goal.priority,
        progress: goal.progress,
        targetDate: isoDate(goal.targetDate, timeZone),
        category: goal.category,
      })),
      activeProjects: activeProjects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        dueDate: isoDate(project.dueDate, timeZone),
        goal: project.goal?.title,
        githubRepo: project.githubRepo,
      })),
      recentNotes: recentNotes.map((note) => ({
        id: note.id,
        title: note.title,
        preview: clip(note.preview, 120),
        updated: isoDate(note.updatedAt, timeZone),
      })),
      completedThisWeek: completedWeek.map((task) => ({
        id: task.id,
        title: task.title,
        completed: isoDate(task.completedAt, timeZone),
      })),
      currentlyLearning: activeLearning.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        progress: item.progress,
        provider: item.provider,
        targetDate: isoDate(item.targetDate, timeZone),
      })),
    };

    const considered: Record<ContextSource, number> = {
      tasks: snapshot.today.tasks.length + snapshot.completedThisWeek.length,
      goals: snapshot.activeGoals.length,
      projects: snapshot.activeProjects.length,
      calendar: snapshot.upcomingEvents.length,
      habits: snapshot.today.habits.length,
      notes: snapshot.recentNotes.length,
      learning: snapshot.currentlyLearning.length,
      gmail: integrations.gmail.connected ? 1 : 0,
      github: integrations.github.connected ? 1 : 0,
    };

    const sources = (Object.keys(considered) as ContextSource[]).filter(
      (key) => considered[key] > 0
    );

    const promptBlock = [
      "Authorized AZIO snapshot for this user only. Treat as ground truth. Do not invent records.",
      "IDs are for tool calls only — never show them to the user.",
      integrationStatusPrompt(integrations),
      JSON.stringify(snapshot),
    ].join("\n");

    return { promptBlock, sources, considered };
  } catch (error) {
    throw new AIError("database", undefined, { cause: error });
  }
}

export function formatNow(timeZone: string) {
  const now = new Date();
  return {
    date: calendarDate(timeZone, now),
    time: formatClock(now, timeZone),
    timeZone,
    weekday: new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(now),
  };
}
