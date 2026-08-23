import type { GoalPriority, GoalStatus } from "@/generated/prisma/enums";

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  NOT_STARTED: "Not started",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const GOAL_PRIORITY_LABEL: Record<GoalPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const GOAL_CATEGORIES = [
  "Career",
  "Learning",
  "Health",
  "Finance",
  "Personal",
  "Creative",
] as const;

export const GOAL_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "paused", label: "Paused" },
] as const;

export type GoalFilter = (typeof GOAL_FILTERS)[number]["id"];
