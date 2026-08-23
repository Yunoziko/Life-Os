import type { ProjectStatus } from "@/generated/prisma/enums";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const PROJECT_COLORS = [
  { id: "stone", label: "Stone", value: "#78716c" },
  { id: "slate", label: "Slate", value: "#64748b" },
  { id: "zinc", label: "Zinc", value: "#71717a" },
  { id: "olive", label: "Olive", value: "#6b7c5a" },
  { id: "ink", label: "Ink", value: "#44403c" },
] as const;

export const PROJECT_ICONS = [
  { id: "folder", label: "Folder" },
  { id: "rocket", label: "Rocket" },
  { id: "target", label: "Target" },
  { id: "book", label: "Book" },
  { id: "code", label: "Code" },
  { id: "briefcase", label: "Briefcase" },
] as const;

export function projectAccent(color?: string | null) {
  return color && color.startsWith("#") ? color : "#78716c";
}
