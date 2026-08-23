import { zonedDayRange } from "@/lib/utils/date";

export type FilterableTask = {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  projectId: string | null;
  goalId: string | null;
  project?: { name: string } | null;
};

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type TaskView = "all" | "today" | "upcoming" | "overdue" | "completed";
export type TaskSort = "relevant" | "due" | "priority" | "created" | "alpha";
export type DueFilter = "any" | "today" | "upcoming" | "overdue" | "none";

export type TaskFilters = {
  view: TaskView;
  query: string;
  priority: string;
  status: string;
  projectId: string;
  goalId: string;
  due: DueFilter;
};

const priorityRank: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

export function emptyTaskFilters(): TaskFilters {
  return {
    view: "all",
    query: "",
    priority: "",
    status: "",
    projectId: "",
    goalId: "",
    due: "any",
  };
}

export function filterAndSortTasks<T extends FilterableTask>(
  tasks: T[],
  filters: TaskFilters,
  timeZone: string,
  sort: TaskSort
) {
  const { start, end } = zonedDayRange(timeZone);
  const query = filters.query.trim().toLowerCase();

  const filtered = tasks.filter((task) => {
    const dueAt = asDate(task.dueAt);
    const completedAt = asDate(task.completedAt);

    if (filters.view === "completed" && task.status !== "DONE") return false;
    if (filters.view !== "completed" && filters.view !== "all" && task.status === "CANCELLED") {
      return false;
    }
    if (filters.view === "all" && task.status === "CANCELLED") return false;
    if (filters.view === "today") {
      const dueToday = Boolean(dueAt && dueAt >= start && dueAt < end);
      const completedToday = Boolean(
        completedAt && completedAt >= start && completedAt < end
      );
      const openUndated = !dueAt && task.status !== "DONE";
      if (!dueToday && !completedToday && !openUndated && !(dueAt && dueAt < start && task.status !== "DONE")) {
        return false;
      }
    }
    if (filters.view === "upcoming") {
      if (!dueAt || dueAt < end || task.status === "DONE") return false;
    }
    if (filters.view === "overdue") {
      if (!dueAt || dueAt >= start || task.status === "DONE") return false;
    }
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.projectId && task.projectId !== filters.projectId) return false;
    if (filters.goalId && task.goalId !== filters.goalId) return false;
    if (filters.due === "today" && !(dueAt && dueAt >= start && dueAt < end)) return false;
    if (filters.due === "upcoming" && !(dueAt && dueAt >= end)) return false;
    if (filters.due === "overdue" && !(dueAt && dueAt < start && task.status !== "DONE")) {
      return false;
    }
    if (filters.due === "none" && dueAt) return false;
    if (query) {
      const haystack = `${task.title} ${task.description ?? ""} ${task.project?.name ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => compareTasks(a, b, sort, start, end));
}

function compareTasks(
  a: FilterableTask,
  b: FilterableTask,
  sort: TaskSort,
  start: Date,
  end: Date
) {
  const aDue = asDate(a.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const bDue = asDate(b.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const aCreated = asDate(a.createdAt)?.getTime() ?? 0;
  const bCreated = asDate(b.createdAt)?.getTime() ?? 0;

  if (sort === "alpha") return a.title.localeCompare(b.title);
  if (sort === "created") return bCreated - aCreated;
  if (sort === "priority") {
    const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
    if (byPriority !== 0) return byPriority;
    return aDue - bDue;
  }
  if (sort === "due") {
    return aDue - bDue;
  }

  const aDone = a.status === "DONE" ? 1 : 0;
  const bDone = b.status === "DONE" ? 1 : 0;
  if (aDone !== bDone) return aDone - bDone;

  const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
  if (byPriority !== 0) return byPriority;

  const aBucket = dueBucket(a, start, end);
  const bBucket = dueBucket(b, start, end);
  if (aBucket !== bBucket) return aBucket - bBucket;

  return aDue - bDue;
}

function dueBucket(task: FilterableTask, start: Date, end: Date) {
  const dueAt = asDate(task.dueAt);
  if (dueAt && dueAt < start) return 0;
  if (dueAt && dueAt < end) return 1;
  if (dueAt) return 2;
  return 3;
}

export function countTaskViews(tasks: FilterableTask[], timeZone: string) {
  return {
    all: filterAndSortTasks(tasks, { ...emptyTaskFilters(), view: "all" }, timeZone, "relevant").length,
    today: filterAndSortTasks(tasks, { ...emptyTaskFilters(), view: "today" }, timeZone, "relevant").length,
    upcoming: filterAndSortTasks(tasks, { ...emptyTaskFilters(), view: "upcoming" }, timeZone, "relevant").length,
    overdue: filterAndSortTasks(tasks, { ...emptyTaskFilters(), view: "overdue" }, timeZone, "relevant").length,
    completed: filterAndSortTasks(tasks, { ...emptyTaskFilters(), view: "completed" }, timeZone, "relevant").length,
  };
}
