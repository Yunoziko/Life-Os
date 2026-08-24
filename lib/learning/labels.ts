import type { LearningStatus, LearningType } from "@/generated/prisma/enums";

export const LEARNING_STATUS_LABEL: Record<LearningStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const LEARNING_TYPE_LABEL: Record<LearningType, string> = {
  COURSE: "Course",
  BOOK: "Book",
  ARTICLE: "Article",
  VIDEO: "Video",
  PODCAST: "Podcast",
  OTHER: "Other",
};

export const LEARNING_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "paused", label: "Paused" },
] as const;

export type LearningFilter = (typeof LEARNING_FILTERS)[number]["id"];

export function hrefForLearningUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
