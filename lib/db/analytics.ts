import { prisma } from "@/lib/db/prisma";
import { getCache } from "@/lib/cache/redis";
import {
  calendarDate,
  formatWeekday,
  zonedDayRange,
} from "@/lib/utils/date";
import { calculateHabitStats, habitWeekday } from "@/lib/habits/stats";
import { calculateTaskProgress, resolveGoalProgress } from "@/lib/utils/progress";
import { getIntegrationConnectionMap } from "@/lib/integrations/status";
import { ensureRecentCalendarSync } from "@/lib/integrations/google/sync";
import { getGitHubActivityEvents } from "@/lib/integrations/github/client";
import { searchGmailSafe } from "@/lib/integrations/gmail";
import { IntegrationError } from "@/lib/integrations/errors";
import {
  eachCalendarDay,
  lookbackStart,
  previousAnalyticsRange,
  resolveAnalyticsRange,
  type AnalyticsRange,
} from "@/lib/analytics/range";
import { classifyGoalMomentum, goalVelocityPerWeek, projectNeedsAttention } from "@/lib/analytics/classify";
import {
  combineMomentum,
  goalPillarScore,
  habitPillarScore,
  projectPillarScore,
  taskPillarScore,
} from "@/lib/analytics/momentum";
import { deriveAnalyticsPatterns } from "@/lib/analytics/patterns";
import type {
  CalendarAnalytics,
  EmailAnalytics,
  GitHubAnalytics,
  GoalAnalyticsItem,
  HabitAnalytics,
  LifeAnalytics,
  MomentumAnalytics,
  ProjectAnalyticsItem,
  TaskTrendPoint,
} from "@/lib/analytics/types";

const MEETING_RE = /\b(meet|meeting|call|sync|standup|stand-up|1:1|interview|zoom|hangout|huddle)\b/i;
const EMAIL_DISCLAIMER =
  "From a focused inbox search of up to 8 recent threads — not a scan of your full mailbox.";

function localHour(date: Date, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date)
  );
}

function durationHours(startAt: Date, endAt: Date | null, allDay: boolean) {
  if (allDay || !endAt) return 0;
  return Math.max(0, (endAt.getTime() - startAt.getTime()) / 3_600_000);
}

function weekdayFromYmdSafe(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getTaskAnalytics(
  range: AnalyticsRange,
  timeZone: string,
  rows: {
    completedInRange: { completedAt: Date | null; goalId: string | null; projectId: string | null }[];
    createdCount: number;
    overdueCount: number;
    completedLookback: { completedAt: Date | null }[];
  }
) {
  const tasksCompleted = rows.completedInRange.length;
  const tasksCreated = rows.createdCount;
  const completionRate =
    tasksCompleted === 0 && tasksCreated === 0
      ? null
      : Math.min(100, Math.round((tasksCompleted / Math.max(tasksCreated, tasksCompleted, 1)) * 100));

  const lookbackDays = eachCalendarDay(lookbackStart(timeZone, 90).startYmd, calendarDate(timeZone));
  const byDay = new Map(lookbackDays.map((date) => [date, 0]));
  for (const task of rows.completedLookback) {
    if (!task.completedAt) continue;
    const key = calendarDate(timeZone, task.completedAt);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const taskTrend: TaskTrendPoint[] = lookbackDays.map((date) => ({
    date,
    completed: byDay.get(date) ?? 0,
  }));

  const completedHours = rows.completedInRange
    .map((task) => (task.completedAt ? localHour(task.completedAt, timeZone) : null))
    .filter((hour): hour is number => hour !== null && Number.isFinite(hour));

  return {
    tasksCompleted,
    tasksCreated,
    completionRate,
    overdueTasks: rows.overdueCount,
    goalsProgressed: new Set(rows.completedInRange.map((task) => task.goalId).filter(Boolean)).size,
    projectsProgressed: new Set(rows.completedInRange.map((task) => task.projectId).filter(Boolean)).size,
    taskTrend,
    completedHours,
  };
}

export function getHabitAnalytics(
  timeZone: string,
  range: AnalyticsRange,
  habits: {
    id: string;
    name: string;
    frequency: "DAILY" | "WEEKLY";
    startDate: Date | null;
    createdAt: Date;
    logs: { date: Date }[];
  }[]
): HabitAnalytics {
  const today = calendarDate(timeZone);
  const heatDays = eachCalendarDay(lookbackStart(timeZone, 90).startYmd, today);
  const heatmapMap = new Map(heatDays.map((date) => [date, { completed: 0, scheduled: 0 }]));
  let rangeScheduled = 0;
  let rangeCompleted = 0;
  const perHabit: { id: string; name: string; rate: number; current: number }[] = [];

  for (const habit of habits) {
    const completedDates = habit.logs.map((log) => log.date.toISOString().slice(0, 10));
    const weekday = habitWeekday(habit.startDate, habit.createdAt, timeZone);
    const startYmd = calendarDate(timeZone, habit.startDate ?? habit.createdAt);
    const stats = calculateHabitStats(completedDates, today, habit.frequency, weekday, range.dayCount, startYmd);
    for (const date of heatDays) {
      const started = date >= startYmd;
      const scheduled = started && (habit.frequency === "DAILY" || weekdayFromYmdSafe(date) === weekday);
      const cell = heatmapMap.get(date);
      if (!cell) continue;
      if (scheduled) cell.scheduled += 1;
      if (scheduled && completedDates.includes(date)) cell.completed += 1;
      if (date >= range.startYmd && date <= range.endYmd && scheduled) {
        rangeScheduled += 1;
        if (completedDates.includes(date)) rangeCompleted += 1;
      }
    }
    perHabit.push({
      id: habit.id,
      name: habit.name,
      rate: stats.completionRate,
      current: stats.currentStreak,
    });
  }

  const ranked = [...perHabit].sort((a, b) => b.rate - a.rate);
  const streakLead = [...perHabit].sort((a, b) => b.current - a.current)[0];
  const activeDays = heatDays.filter((date) => {
    const cell = heatmapMap.get(date);
    return Boolean(cell && cell.scheduled > 0 && cell.completed > 0);
  });
  const workspace = calculateHabitStats(activeDays, today, "DAILY", 0, heatDays.length);

  return {
    overallRate: rangeScheduled === 0 ? null : Math.round((rangeCompleted / rangeScheduled) * 100),
    currentStreak: workspace.currentStreak,
    bestStreak: Math.max(workspace.bestStreak, workspace.currentStreak),
    mostConsistent:
      ranked[0] && ranked[0].rate > 0
        ? { id: ranked[0].id, name: ranked[0].name, rate: ranked[0].rate }
        : null,
    leastConsistent:
      ranked.length > 1
        ? {
            id: ranked[ranked.length - 1].id,
            name: ranked[ranked.length - 1].name,
            rate: ranked[ranked.length - 1].rate,
          }
        : null,
    streakHabit:
      streakLead && streakLead.current >= 3
        ? { id: streakLead.id, name: streakLead.name, streak: streakLead.current }
        : null,
    heatmap: heatDays.map((date) => ({
      date,
      ...(heatmapMap.get(date) ?? { completed: 0, scheduled: 0 }),
    })),
  };
}

export function getGoalAnalytics(
  timeZone: string,
  goals: {
    id: string;
    title: string;
    progress: number;
    targetDate: Date | null;
    createdAt: Date;
    milestones: { completed: boolean }[];
    tasks: { status: string }[];
  }[]
): GoalAnalyticsItem[] {
  return goals.map((goal) => {
    const resolved = resolveGoalProgress({
      manual: goal.progress,
      milestones: goal.milestones,
      tasks: goal.tasks,
    });
    const classified = classifyGoalMomentum({
      progress: resolved.percent,
      targetDate: goal.targetDate,
      createdAt: goal.createdAt,
      timeZone,
    });
    return {
      id: goal.id,
      title: goal.title,
      progress: resolved.percent,
      targetDate: goal.targetDate?.toISOString() ?? null,
      velocity: goalVelocityPerWeek(resolved.percent, goal.createdAt, timeZone),
      status: classified.status,
      expected: classified.expected,
      reason: classified.reason,
    };
  });
}

export function getProjectAnalytics(
  timeZone: string,
  projects: {
    id: string;
    name: string;
    status: string;
    dueDate: Date | null;
    tasks: { status: string }[];
  }[]
): ProjectAnalyticsItem[] {
  return projects.map((project) => {
    const progress = calculateTaskProgress(project.tasks);
    const attention = projectNeedsAttention({
      status: project.status,
      percent: progress.percent,
      dueDate: project.dueDate,
      total: progress.total,
      timeZone,
    });
    return {
      id: project.id,
      name: project.name,
      completed: progress.completed,
      remaining: progress.total - progress.completed,
      percent: progress.percent,
      dueDate: project.dueDate?.toISOString() ?? null,
      attention: attention.attention,
      reason: attention.reason,
    };
  });
}

export function getCalendarAnalytics(
  timeZone: string,
  range: AnalyticsRange,
  connectedGoogle: boolean,
  events: { title: string; startAt: Date; endAt: Date | null; allDay: boolean; source: string }[]
): CalendarAnalytics {
  let scheduledHours = 0;
  let meetingHours = 0;
  let focusHours = 0;
  let timedEvents = 0;
  let allDayEvents = 0;
  const weekdayCounts = new Map<string, number>();

  for (const event of events) {
    const weekday = formatWeekday(event.startAt, timeZone, "long");
    weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
    if (event.allDay) {
      allDayEvents += 1;
      continue;
    }
    timedEvents += 1;
    const hours = durationHours(event.startAt, event.endAt, false);
    scheduledHours += hours;
    if (MEETING_RE.test(event.title)) meetingHours += hours;
    else focusHours += hours;
  }

  const wakingHours = range.dayCount * 14;
  const busiest = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    connectedGoogle,
    using: connectedGoogle ? "lifeos+google" : "lifeos",
    timedEvents,
    allDayEvents,
    scheduledHours: Math.round(scheduledHours * 10) / 10,
    focusHours: Math.round(focusHours * 10) / 10,
    meetingHours: Math.round(meetingHours * 10) / 10,
    freeHours: timedEvents > 0 ? Math.max(0, Math.round((wakingHours - scheduledHours) * 10) / 10) : null,
    wakingWindow: "Free time uses a 08:00–22:00 waking window (14h/day) minus timed events.",
    busiestWeekday: busiest ? { label: busiest[0], events: busiest[1] } : null,
  };
}

export async function getGitHubAnalytics(userId: string, range: AnalyticsRange): Promise<GitHubAnalytics> {
  try {
    const events = await getGitHubActivityEvents(userId);
    if (events === null) {
      return { connected: false, commits: 0, pullRequests: 0, issues: 0, repos: [] };
    }
    const inRange = events.filter((event) => {
      const time = Date.parse(event.createdAt);
      return Number.isFinite(time) && time >= range.start.getTime() && time < range.end.getTime();
    });
    const repos = new Map<string, number>();
    let commits = 0;
    let pullRequests = 0;
    let issues = 0;
    for (const event of inRange) {
      if (event.repo) repos.set(event.repo, (repos.get(event.repo) ?? 0) + 1);
      if (event.type === "PushEvent") commits += Math.max(1, event.commits);
      if (event.type === "PullRequestEvent") pullRequests += 1;
      if (event.type === "IssuesEvent" || event.type === "IssueCommentEvent") issues += 1;
    }
    return {
      connected: true,
      commits,
      pullRequests,
      issues,
      repos: [...repos.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, events: count })),
    };
  } catch (error) {
    return {
      connected: true,
      error: error instanceof IntegrationError ? error.message : "GitHub could not be reached just then.",
      commits: 0,
      pullRequests: 0,
      issues: 0,
      repos: [],
    };
  }
}

export async function getEmailAnalytics(userId: string, range: AnalyticsRange): Promise<EmailAnalytics> {
  const days = Math.min(90, Math.max(1, range.dayCount));
  try {
    const [inbox, important] = await Promise.all([
      searchGmailSafe(userId, `in:inbox newer_than:${days}d`),
      searchGmailSafe(
        userId,
        `in:inbox newer_than:${days}d (urgent OR invoice OR interview OR "action required")`
      ).catch(() => []),
    ]);
    const categories = new Map<string, number>();
    for (const message of inbox) {
      const haystack = `${message.subject} ${message.sender}`.toLowerCase();
      let label = "Other";
      if (/\b(github|gitlab|commit|pull request)\b/.test(haystack)) label = "Development";
      else if (/\b(invoice|receipt|payment|billing)\b/.test(haystack)) label = "Money";
      else if (/\b(meet|invite|calendar|zoom)\b/.test(haystack)) label = "Calendar";
      categories.set(label, (categories.get(label) ?? 0) + 1);
    }
    return {
      connected: true,
      found: inbox.length,
      categories: [...categories.entries()].map(([label, count]) => ({ label, count })),
      important: important.slice(0, 3).map((item) => ({ subject: item.subject, sender: item.sender })),
      disclaimer: EMAIL_DISCLAIMER,
    };
  } catch (error) {
    if (error instanceof IntegrationError && error.code === "not_connected") {
      return { connected: false, found: 0, categories: [], important: [], disclaimer: EMAIL_DISCLAIMER };
    }
    return {
      connected: true,
      error: error instanceof IntegrationError ? error.message : "Gmail could not be reached just then.",
      found: 0,
      categories: [],
      important: [],
      disclaimer: EMAIL_DISCLAIMER,
    };
  }
}

function momentumFromParts(input: {
  tasksCompleted: number;
  tasksCreated: number;
  overdue: number;
  goals: GoalAnalyticsItem[];
  habits: HabitAnalytics;
  projects: ProjectAnalyticsItem[];
  previousScore: number | null;
}): MomentumAnalytics {
  return combineMomentum(
    [
      taskPillarScore({
        completed: input.tasksCompleted,
        created: input.tasksCreated,
        overdue: input.overdue,
      }),
      goalPillarScore({
        progress: input.goals.map((goal) => goal.progress),
        behind: input.goals.filter((goal) => goal.status === "behind").length,
        atRisk: input.goals.filter((goal) => goal.status === "at_risk").length,
      }),
      habitPillarScore(input.habits.overallRate, input.habits.currentStreak),
      projectPillarScore({
        percents: input.projects.map((project) => project.percent),
        attention: input.projects.filter((project) => project.attention).length,
      }),
    ],
    input.previousScore
  );
}

export async function getLifeAnalytics(
  userId: string,
  timeZone: string,
  input: { range?: string; from?: string; to?: string },
  weekStartsOn = 1,
  options: { includeExternal?: boolean } = {}
): Promise<LifeAnalytics> {
  const includeExternal = options.includeExternal ?? true;
  const range = resolveAnalyticsRange(timeZone, input, weekStartsOn);
  const cache = getCache();
  const cacheKey = `analytics:v2:${userId}:${range.id}:${range.startYmd}:${range.endYmd}:${timeZone}:${includeExternal ? "ext" : "core"}`;
  const hit = await cache.get<LifeAnalytics>(cacheKey);
  if (hit) return { ...hit, range };

  const lookback = lookbackStart(timeZone, 90);
  const today = zonedDayRange(timeZone);

  await ensureRecentCalendarSync(userId, timeZone).catch(() => undefined);

  const [
    completedInRange,
    createdCount,
    overdueCount,
    completedLookback,
    goals,
    projects,
    habits,
    events,
    counts,
    integrations,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: "DONE", completedAt: { gte: range.start, lt: range.end } },
      select: { completedAt: true, goalId: true, projectId: true },
    }),
    prisma.task.count({
      where: { userId, createdAt: { gte: range.start, lt: range.end } },
    }),
    prisma.task.count({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueAt: { lt: today.start },
      },
    }),
    prisma.task.findMany({
      where: { userId, status: "DONE", completedAt: { gte: lookback.start, lt: lookback.end } },
      select: { completedAt: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: { in: ["ACTIVE", "NOT_STARTED"] } },
      select: {
        id: true,
        title: true,
        progress: true,
        targetDate: true,
        createdAt: true,
        milestones: { select: { completed: true } },
        tasks: { where: { status: { not: "CANCELLED" } }, select: { status: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.project.findMany({
      where: { userId, status: { in: ["ACTIVE", "PLANNED", "ON_HOLD"] } },
      select: {
        id: true,
        name: true,
        status: true,
        dueDate: true,
        tasks: { where: { status: { not: "CANCELLED" } }, select: { status: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.habit.findMany({
      where: { userId, archived: false, paused: false },
      select: {
        id: true,
        name: true,
        frequency: true,
        startDate: true,
        createdAt: true,
        logs: {
          where: { completed: true, date: { gte: lookback.midnight, lte: lookback.todayMidnight } },
          select: { date: true },
        },
      },
      take: 24,
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: range.start, lt: range.end } },
      select: { title: true, startAt: true, endAt: true, allDay: true, source: true },
    }),
    Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.habit.count({ where: { userId } }),
      prisma.project.count({ where: { userId } }),
      prisma.calendarEvent.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.learningItem.count({ where: { userId } }),
    ]),
    getIntegrationConnectionMap(userId),
  ]);

  const tasks = getTaskAnalytics(range, timeZone, {
    completedInRange,
    createdCount,
    overdueCount,
    completedLookback,
  });
  const habitAnalytics = getHabitAnalytics(timeZone, range, habits);
  const goalItems = getGoalAnalytics(timeZone, goals);
  const projectItems = getProjectAnalytics(timeZone, projects);
  const calendar = getCalendarAnalytics(timeZone, range, integrations["google-calendar"].connected, events);

  const [github, email] = includeExternal
    ? await Promise.all([getGitHubAnalytics(userId, range), getEmailAnalytics(userId, range)])
    : [
        { connected: false, commits: 0, pullRequests: 0, issues: 0, repos: [] } satisfies GitHubAnalytics,
        {
          connected: false,
          found: 0,
          categories: [],
          important: [],
          disclaimer: EMAIL_DISCLAIMER,
        } satisfies EmailAnalytics,
      ];

  const previous = previousAnalyticsRange(range, timeZone);
  const [previousCompleted, previousCreated] = await Promise.all([
    prisma.task.count({
      where: { userId, status: "DONE", completedAt: { gte: previous.start, lt: previous.end } },
    }),
    prisma.task.count({
      where: { userId, createdAt: { gte: previous.start, lt: previous.end } },
    }),
  ]);
  const previousScore = momentumFromParts({
    tasksCompleted: previousCompleted,
    tasksCreated: previousCreated,
    overdue: overdueCount,
    goals: goalItems,
    habits: habitAnalytics,
    projects: projectItems,
    previousScore: null,
  }).score;

  const momentum = momentumFromParts({
    tasksCompleted: tasks.tasksCompleted,
    tasksCreated: tasks.tasksCreated,
    overdue: tasks.overdueTasks,
    goals: goalItems,
    habits: habitAnalytics,
    projects: projectItems,
    previousScore,
  });

  const result: LifeAnalytics = {
    range,
    hasAnyData: counts.some((count) => count > 0),
    overview: {
      tasksCompleted: tasks.tasksCompleted,
      tasksCreated: tasks.tasksCreated,
      completionRate: tasks.completionRate,
      overdueTasks: tasks.overdueTasks,
      goalsProgressed: tasks.goalsProgressed,
      habitsCompleted: habitAnalytics.heatmap
        .filter((day) => day.date >= range.startYmd && day.date <= range.endYmd)
        .reduce((sum, day) => sum + day.completed, 0),
      projectsProgressed: tasks.projectsProgressed,
      calendarHours: calendar.scheduledHours,
      githubActivity: github.connected ? github.commits + github.pullRequests + github.issues : null,
    },
    taskTrend: tasks.taskTrend,
    habits: habitAnalytics,
    goals: goalItems,
    projects: projectItems,
    calendar,
    github,
    email,
    patterns: deriveAnalyticsPatterns({
      timeZone,
      completedHours: tasks.completedHours,
      overdue: tasks.overdueTasks,
      habits: habitAnalytics,
      goals: goalItems,
      projects: projectItems,
      calendar,
      trend: tasks.taskTrend.filter((point) => point.date >= range.startYmd && point.date <= range.endYmd),
    }),
    momentum,
  };

  await cache.set(cacheKey, result, 45);
  return result;
}

export async function getMomentumSnapshot(userId: string, timeZone: string, weekStartsOn = 1) {
  const analytics = await getLifeAnalytics(userId, timeZone, { range: "this-week" }, weekStartsOn, {
    includeExternal: false,
  });
  const insight =
    analytics.patterns[0]?.body ??
    (analytics.momentum.score === null
      ? "Use AZIO for a while and momentum will have something to stand on."
      : `Momentum is ${analytics.momentum.score} this week.`);
  return {
    score: analytics.momentum.score,
    delta: analytics.momentum.delta,
    insight,
    hasAnyData: analytics.hasAnyData,
  };
}
