import type { TaskPriority, TaskStatus } from "@/generated/prisma/enums";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Completed",
  CANCELLED: "Cancelled",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  NONE: "None",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TASK_VIEWS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
] as const;

export const TASK_SORTS = [
  { id: "relevant", label: "Relevant" },
  { id: "due", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "created", label: "Created" },
  { id: "alpha", label: "A–Z" },
] as const;
